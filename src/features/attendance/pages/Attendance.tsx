import React from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useUserAuth } from "@/context/UserAuthContext";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminAttendanceView } from "../components/AdminAttendanceView";
import { UserAttendanceView } from "../components/UserAttendanceView";
import { ViewState } from "@/layout/AppShell";

interface AttendancePageProps {
  setActiveView?: (view: ViewState) => void;
}

export default function Attendance({ setActiveView }: AttendancePageProps) {
  const { admin, loading: adminLoading } = useAdminAuth();
  const { user, loading: userLoading, isAdmin, isCoAdmin } = useUserAuth();

  const isLoading = adminLoading || userLoading;

  return (
    <>
      {isLoading ? (
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : admin || (user && (isAdmin || isCoAdmin)) ? (
        <AdminAttendanceView />
      ) : user ? (
        <UserAttendanceView userId={user.uid} />
      ) : (
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
      )}
    </>
  );
}