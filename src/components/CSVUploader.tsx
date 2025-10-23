import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import GeneratedCredentialsTable from "./GeneratedCredentialsTable";

interface GeneratedUser {
  full_name: string;
  postal_code: string;
  birthday: string;
  generated_email: string;
  generated_password: string;
}

const CSVUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedUsers, setGeneratedUsers] = useState<GeneratedUser[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast.error("Please select a valid CSV file");
        return;
      }
      setFile(selectedFile);
      toast.success("CSV file selected");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        
        const { data, error } = await supabase.functions.invoke("parse-csv", {
          body: { csvContent: text },
        });

        if (error) throw error;

        if (data && data.users) {
          setGeneratedUsers(data.users);
          toast.success(`Successfully generated credentials for ${data.users.length} users`);
        }
      };
      reader.readAsText(file);
    } catch (error: any) {
      console.error("Error uploading CSV:", error);
      toast.error(error.message || "Failed to process CSV file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Select a CSV file containing user data. Required columns: name, postal_code, birthday
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex gap-4">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || loading}
                className="px-8"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Process
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">CSV Format Requirements:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>First row must contain headers</li>
                  <li>Required columns: <code className="text-xs bg-background px-1 py-0.5 rounded">name</code>, <code className="text-xs bg-background px-1 py-0.5 rounded">postal_code</code>, <code className="text-xs bg-background px-1 py-0.5 rounded">birthday</code></li>
                  <li>Birthday format: YYYY-MM-DD</li>
                  <li>Email will be generated as: firstname.lastname@company.com</li>
                  <li>Password will be generated using user details</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {generatedUsers.length > 0 && (
        <GeneratedCredentialsTable users={generatedUsers} />
      )}
    </div>
  );
};

export default CSVUploader;
