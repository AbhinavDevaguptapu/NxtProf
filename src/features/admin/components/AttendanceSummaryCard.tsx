import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UserCheck, UserX } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

interface AttendanceSummaryCardProps {
  employeeId: string;
}

interface AttendanceStats {
  standupsAttended: number;
  standupsMissed: number;
  learningHoursAttended: number;
  learningHoursMissed: number;
}

const StatDisplay = ({
  label,
  attended,
  missed,
  icon,
}: {
  label: string;
  attended: number;
  missed: number;
  icon: React.ReactNode;
}) => {
  const total = attended + missed;
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium flex items-center gap-2">
        {icon} {label}
      </h3>
      <div className="flex items-center gap-4">
        <Progress value={percentage} className="w-full h-2" />
        <span className="text-xs font-bold text-muted-foreground">{percentage}%</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Attended: {attended}</span>
        <span>Missed: {missed}</span>
      </div>
    </div>
  );
};

export default function AttendanceSummaryCard({ employeeId }: AttendanceSummaryCardProps) {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    const fetchAttendanceStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const standupPresentQuery = query(
          collection(db, 'attendance'),
          where('employee_id', '==', employeeId),
          where('status', '==', 'Present')
        );
        const standupMissedQuery = query(
          collection(db, 'attendance'),
          where('employee_id', '==', employeeId),
          where('status', '==', 'Missed')
        );

        const learningPresentQuery = query(
          collection(db, 'learning_hours_attendance'),
          where('employee_id', '==', employeeId),
          where('status', '==', 'Present')
        );
        const learningMissedQuery = query(
          collection(db, 'learning_hours_attendance'),
          where('employee_id', '==', employeeId),
          where('status', '==', 'Missed')
        );

        const [
          standupsAttendedSnap,
          standupsMissedSnap,
          learningHoursAttendedSnap,
          learningHoursMissedSnap,
        ] = await Promise.all([
            getCountFromServer(standupPresentQuery),
            getCountFromServer(standupMissedQuery),
            getCountFromServer(learningPresentQuery),
            getCountFromServer(learningMissedQuery),
        ]);

        setStats({
          standupsAttended: standupsAttendedSnap.data().count,
          standupsMissed: standupsMissedSnap.data().count,
          learningHoursAttended: learningHoursAttendedSnap.data().count,
          learningHoursMissed: learningHoursMissedSnap.data().count,
        });
      } catch (err) {
        console.error('Failed to fetch attendance stats:', err);
        setError('Could not load attendance data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceStats();
  }, [employeeId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>Overall performance at a glance.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-red-500 text-center py-4">{error}</p>
        ) : stats ? (
          <div className="space-y-6">
            <StatDisplay
              label="Standups"
              attended={stats.standupsAttended}
              missed={stats.standupsMissed}
              icon={<UserCheck className="h-4 w-4 text-blue-500" />}
            />
            <StatDisplay
              label="Learning Hours"
              attended={stats.learningHoursAttended}
              missed={stats.learningHoursMissed}
              icon={<UserCheck className="h-4 w-4 text-green-500" />}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No attendance data found.</p>
        )}
      </CardContent>
    </Card>
  );
}
