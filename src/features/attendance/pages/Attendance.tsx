import { useState } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useUserAuth } from "@/context/UserAuthContext";
import { Loader2, Users, User } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AdminAttendanceView } from "../components/AdminAttendanceView";
import { UserAttendanceView } from "../components/UserAttendanceView";

export default function Attendance() {
  const { admin, loading: adminLoading } = useAdminAuth();
  const { user, loading: userLoading, isAdmin, isCoAdmin } = useUserAuth();
  const [showPersonalView, setShowPersonalView] = useState(false);

  const isLoading = adminLoading || userLoading;

  const renderContent = () => {
    if (admin || (user && isAdmin)) {
      return <AdminAttendanceView />;
    } else if (isCoAdmin) {
      return (
        <>
          <div className="mb-6 flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <Label htmlFor="view-toggle" className="text-sm font-medium">
                Manage Team Attendance
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <Label htmlFor="view-toggle" className="text-sm">
                My Attendance
              </Label>
              <Switch
                id="view-toggle"
                checked={showPersonalView}
                onCheckedChange={setShowPersonalView}
              />
            </div>
          </div>
          {showPersonalView ? (
            <UserAttendanceView userId={user!.uid} />
          ) : (
            <AdminAttendanceView />
          )}
        </>
      );
    } else if (user) {
      return <UserAttendanceView userId={user.uid} />;
    } else {
      return (
        <div className="flex-grow flex items-center justify-center">
          <Card className="p-6 text-center">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please log in to view your attendance records.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="mb-6 flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="h-5 w-48 bg-muted animate-pulse rounded" />
            <div className="h-9 w-32 bg-muted animate-pulse rounded-md" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-4">
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </div>
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 flex gap-4">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        renderContent()
      )}
    </>
  );
}
