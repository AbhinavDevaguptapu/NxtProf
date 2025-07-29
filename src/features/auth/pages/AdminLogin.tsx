import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const AdminLogin: React.FC = () => {
  const { admin, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (adminLoading) return;
    if (admin) navigate("/admin", { replace: true });
  }, [admin, adminLoading, navigate]);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              To access the admin dashboard, please sign in with an authorized
              admin account using the main authentication page.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link to="/auth" replace>
                Go to Sign-In Page
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
