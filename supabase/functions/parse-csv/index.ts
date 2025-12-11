import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CSVRow {
  name: string;
  postal_code: string;
  birthday: string;
}

interface GeneratedUser {
  full_name: string;
  postal_code: string;
  birthday: string;
  generated_email: string;
  generated_password: string;
}

// Validation rules
const VALIDATION = {
  name: { maxLength: 100, pattern: /^[a-zA-Z\s\-'.]+$/ },
  postal_code: { maxLength: 20, pattern: /^[A-Z0-9\s\-]+$/i },
  birthday: { pattern: /^\d{4}-\d{2}-\d{2}$/, minYear: 1900, maxYear: new Date().getFullYear() },
  maxRows: 1000,
  maxFileSize: 5 * 1024 * 1024, // 5MB
};

// Sanitize CSV value to prevent formula injection
function sanitizeCSVValue(value: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  // Remove potential formula injection
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || 
      trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return trimmed.substring(1);
  }
  return trimmed;
}

// Validate name
function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: "Name is required" };
  }
  if (name.length > VALIDATION.name.maxLength) {
    return { valid: false, error: `Name must be less than ${VALIDATION.name.maxLength} characters` };
  }
  if (!VALIDATION.name.pattern.test(name)) {
    return { valid: false, error: "Name contains invalid characters" };
  }
  return { valid: true };
}

// Validate postal code
function validatePostalCode(postalCode: string): { valid: boolean; error?: string } {
  if (!postalCode || postalCode.length === 0) {
    return { valid: false, error: "Postal code is required" };
  }
  if (postalCode.length > VALIDATION.postal_code.maxLength) {
    return { valid: false, error: `Postal code must be less than ${VALIDATION.postal_code.maxLength} characters` };
  }
  if (!VALIDATION.postal_code.pattern.test(postalCode)) {
    return { valid: false, error: "Postal code contains invalid characters" };
  }
  return { valid: true };
}

// Validate birthday
function validateBirthday(birthday: string): { valid: boolean; error?: string } {
  if (!birthday || birthday.length === 0) {
    return { valid: false, error: "Birthday is required" };
  }
  if (!VALIDATION.birthday.pattern.test(birthday)) {
    return { valid: false, error: "Birthday must be in YYYY-MM-DD format" };
  }
  const year = parseInt(birthday.split("-")[0], 10);
  if (year < VALIDATION.birthday.minYear || year > VALIDATION.birthday.maxYear) {
    return { valid: false, error: `Birth year must be between ${VALIDATION.birthday.minYear} and ${VALIDATION.birthday.maxYear}` };
  }
  return { valid: true };
}

// Function to generate email from name
function generateEmail(name: string): string {
  const cleanName = name.toLowerCase().trim().replace(/[^a-z\s]/g, "").replace(/\s+/g, ".");
  return `${cleanName}@company.com`;
}

// Function to generate cryptographically secure password
function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(x => charset[x % charset.length])
    .join('');
}

// Parse CSV content with validation
function parseCSV(csvContent: string): CSVRow[] {
  // Check file size
  if (csvContent.length > VALIDATION.maxFileSize) {
    throw new Error(`CSV file is too large. Maximum size is ${VALIDATION.maxFileSize / (1024 * 1024)}MB`);
  }

  const lines = csvContent.trim().split("\n").filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV must contain headers and at least one data row");
  }

  // Check row count
  if (lines.length - 1 > VALIDATION.maxRows) {
    throw new Error(`CSV has too many rows. Maximum is ${VALIDATION.maxRows} rows`);
  }

  // Parse headers
  const headerLine = lines[0];
  const headers = headerLine.split(",").map(h => sanitizeCSVValue(h).toLowerCase());
  
  console.log("Found CSV headers:", headers);
  
  // Find column indices with flexible matching
  const nameIndex = headers.findIndex(h => 
    h.includes("name") || h === "full_name" || h === "fullname"
  );
  const postalIndex = headers.findIndex(h => 
    h.includes("postal") || h.includes("zip") || h === "postal_code" || h === "postalcode"
  );
  const birthdayIndex = headers.findIndex(h => 
    h.includes("birth") || h.includes("dob") || h === "birthday" || h === "date_of_birth"
  );

  if (nameIndex === -1 || postalIndex === -1 || birthdayIndex === -1) {
    const missing = [];
    if (nameIndex === -1) missing.push("name (e.g., 'name', 'full_name', 'fullname')");
    if (postalIndex === -1) missing.push("postal code (e.g., 'postal_code', 'zip', 'postal')");
    if (birthdayIndex === -1) missing.push("birthday (e.g., 'birthday', 'birth', 'dob', 'date_of_birth')");
    
    throw new Error(
      `CSV is missing required columns: ${missing.join(", ")}. Found columns: ${headers.join(", ")}`
    );
  }

  console.log(`Column mapping - Name: ${nameIndex}, Postal: ${postalIndex}, Birthday: ${birthdayIndex}`);

  const rows: CSVRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(",").map(v => sanitizeCSVValue(v));
    
    const name = values[nameIndex];
    const postal_code = values[postalIndex];
    const birthday = values[birthdayIndex];

    // Validate all fields
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      errors.push(`Row ${i}: ${nameValidation.error}`);
      continue;
    }

    const postalValidation = validatePostalCode(postal_code);
    if (!postalValidation.valid) {
      errors.push(`Row ${i}: ${postalValidation.error}`);
      continue;
    }

    const birthdayValidation = validateBirthday(birthday);
    if (!birthdayValidation.valid) {
      errors.push(`Row ${i}: ${birthdayValidation.error}`);
      continue;
    }

    rows.push({ name, postal_code, birthday });
  }

  if (errors.length > 0) {
    console.warn("Validation errors:", errors);
  }

  if (rows.length === 0) {
    throw new Error(`No valid data rows found in CSV. ${errors.length > 0 ? `Errors: ${errors.slice(0, 3).join("; ")}` : ""}`);
  }

  return rows;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("Processing CSV for user:", user.id);

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error("Error checking user role:", roleError);
      throw new Error("Failed to verify user permissions");
    }

    if (!userRole) {
      console.warn(`Unauthorized access attempt by user ${user.id} - missing admin role`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin role required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    console.log("Admin role verified for user:", user.id);

    const { csvContent } = await req.json();
    if (!csvContent) {
      throw new Error("No CSV content provided");
    }

    // Parse and validate CSV
    const csvRows = parseCSV(csvContent);
    console.log(`Parsed ${csvRows.length} valid rows from CSV`);

    // Generate credentials for each user with secure passwords
    const generatedUsers: GeneratedUser[] = csvRows.map(row => ({
      full_name: row.name,
      postal_code: row.postal_code,
      birthday: row.birthday,
      generated_email: generateEmail(row.name),
      generated_password: generateSecurePassword(16),
    }));

    // Store in database
    const { error: insertError } = await supabase
      .from("imported_users")
      .insert(
        generatedUsers.map(u => ({
          imported_by: user.id,
          full_name: u.full_name,
          postal_code: u.postal_code,
          birthday: u.birthday,
          generated_email: u.generated_email,
          generated_password: u.generated_password,
        }))
      );

    if (insertError) {
      console.error("Error inserting users:", insertError);
      throw insertError;
    }

    console.log(`Successfully imported ${generatedUsers.length} users by admin ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        users: generatedUsers,
        count: generatedUsers.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in parse-csv function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
