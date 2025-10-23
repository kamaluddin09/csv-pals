import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import CSVUploader from "@/components/CSVUploader";
import ImportedUsersTable from "@/components/ImportedUsersTable";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"upload" | "users">("upload");

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-sidebar-background to-muted">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-card border-r border-border shadow-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">User Manager</h1>
                <p className="text-xs text-muted-foreground">Admin Portal</p>
              </div>
            </div>

            <nav className="space-y-2">
              <Button
                variant={activeView === "upload" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveView("upload")}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Users
              </Button>
              <Button
                variant={activeView === "users" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveView("users")}
              >
                <Users className="mr-2 h-4 w-4" />
                View Imported Users
              </Button>
            </nav>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Admin Account</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-3 w-3" />
              Sign Out
            </Button>
          </div>
          <div className="max-w-6xl mx-auto">
            {activeView === "upload" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">Import Users from CSV</h2>
                  <p className="text-muted-foreground">
                    Upload a CSV file containing user data to generate credentials automatically
                  </p>
                </div>
                <CSVUploader />
              </div>
            )}

            {activeView === "users" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">Imported Users</h2>
                  <p className="text-muted-foreground">
                    View all users imported through CSV uploads
                  </p>
                </div>
                <ImportedUsersTable />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
