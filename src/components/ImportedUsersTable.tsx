import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface ImportedUser {
  id: string;
  full_name: string;
  postal_code: string;
  birthday: string;
  generated_email: string;
  generated_password: string;
  created_at: string;
}

const ImportedUsersTable = () => {
  const [users, setUsers] = useState<ImportedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImportedUsers();
  }, []);

  const fetchImportedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("imported_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching imported users:", error);
      toast.error("Failed to load imported users");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-lg">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="border-border shadow-lg">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium text-foreground">No imported users yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a CSV file to import users and generate credentials
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-lg">
      <CardHeader>
        <CardTitle>Imported Users Database</CardTitle>
        <CardDescription>
          {users.length} total user{users.length !== 1 ? "s" : ""} imported
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Full Name</TableHead>
                <TableHead>Postal Code</TableHead>
                <TableHead>Birthday</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Imported Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.postal_code}</TableCell>
                  <TableCell>{user.birthday}</TableCell>
                  <TableCell className="font-mono text-sm">{user.generated_email}</TableCell>
                  <TableCell className="font-mono text-sm">{user.generated_password}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportedUsersTable;
