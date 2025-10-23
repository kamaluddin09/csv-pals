import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface GeneratedUser {
  full_name: string;
  postal_code: string;
  birthday: string;
  generated_email: string;
  generated_password: string;
}

interface GeneratedCredentialsTableProps {
  users: GeneratedUser[];
}

const GeneratedCredentialsTable = ({ users }: GeneratedCredentialsTableProps) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadCSV = () => {
    const headers = ["Full Name", "Postal Code", "Birthday", "Generated Email", "Generated Password"];
    const rows = users.map(u => [
      u.full_name,
      u.postal_code,
      u.birthday,
      u.generated_email,
      u.generated_password
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-credentials-${new Date().toISOString()}.csv`;
    a.click();
    toast.success("Credentials exported to CSV");
  };

  return (
    <Card className="border-border shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generated User Credentials</CardTitle>
            <CardDescription>
              {users.length} user{users.length !== 1 ? "s" : ""} processed successfully
            </CardDescription>
          </div>
          <Button onClick={downloadCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Full Name</TableHead>
                <TableHead>Postal Code</TableHead>
                <TableHead>Birthday</TableHead>
                <TableHead>Generated Email</TableHead>
                <TableHead>Generated Password</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.postal_code}</TableCell>
                  <TableCell>{user.birthday}</TableCell>
                  <TableCell className="font-mono text-sm">{user.generated_email}</TableCell>
                  <TableCell className="font-mono text-sm">{user.generated_password}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(user.generated_email, "Email")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(user.generated_password, "Password")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
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

export default GeneratedCredentialsTable;
