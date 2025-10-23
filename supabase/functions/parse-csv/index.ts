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

// Function to generate email from name
function generateEmail(name: string): string {
  const cleanName = name.toLowerCase().trim().replace(/\s+/g, ".");
  return `${cleanName}@company.com`;
}

// Function to generate password using user details
function generatePassword(name: string, postalCode: string, birthday: string): string {
  // Extract first letter of first name and last name
  const nameParts = name.trim().split(/\s+/);
  const firstInitial = nameParts[0]?.charAt(0).toUpperCase() || "A";
  const lastInitial = nameParts[nameParts.length - 1]?.charAt(0).toUpperCase() || "Z";
  
  // Extract last 4 digits of postal code
  const postalDigits = postalCode.replace(/\D/g, "").slice(-4) || "0000";
  
  // Extract year from birthday
  const year = birthday.split("-")[0] || "1990";
  
  // Combine: FirstInitialLastInitial + PostalDigits + Year + special char
  return `${firstInitial}${lastInitial}${postalDigits}${year}!`;
}

// Parse CSV content
function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must contain headers and at least one data row");
  }

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const nameIndex = headers.findIndex(h => h.includes("name"));
  const postalIndex = headers.findIndex(h => h.includes("postal"));
  const birthdayIndex = headers.findIndex(h => h.includes("birth"));

  if (nameIndex === -1 || postalIndex === -1 || birthdayIndex === -1) {
    throw new Error("CSV must contain 'name', 'postal_code', and 'birthday' columns");
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    if (values.length >= 3) {
      rows.push({
        name: values[nameIndex],
        postal_code: values[postalIndex],
        birthday: values[birthdayIndex],
      });
    }
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

    const { csvContent } = await req.json();
    if (!csvContent) {
      throw new Error("No CSV content provided");
    }

    // Parse CSV
    const csvRows = parseCSV(csvContent);
    console.log(`Parsed ${csvRows.length} rows from CSV`);

    // Generate credentials for each user
    const generatedUsers: GeneratedUser[] = csvRows.map(row => ({
      full_name: row.name,
      postal_code: row.postal_code,
      birthday: row.birthday,
      generated_email: generateEmail(row.name),
      generated_password: generatePassword(row.name, row.postal_code, row.birthday),
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

    console.log(`Successfully imported ${generatedUsers.length} users`);

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
