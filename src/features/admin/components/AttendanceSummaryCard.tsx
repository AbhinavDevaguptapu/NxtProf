import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// --- Types ---
interface AttendanceSummaryCardProps {
  employeeId: string;
}

interface AttendanceRecord {
  scheduled_at: Timestamp;
  status: 'Present' | 'Missed' | 'Not Available' | 'Absent';
}

interface MonthlyStat {
  standupsAttended: number;
  standupsMissed: number;
  standupsNotAvailable: number;
  standupsAbsent: number;
  learningHoursAttended: number;
  learningHoursMissed: number;
  learningHoursNotAvailable: number;
  learningHoursAbsent: number;
}

type MonthlyStats = Record<string, MonthlyStat>;

// --- Helper Functions ---
const processAttendanceRecords = (
  standupRecords: AttendanceRecord[],
  learningRecords: AttendanceRecord[]
): MonthlyStats => {
  const monthlyStats: MonthlyStats = {};

  const processRecords = (records: AttendanceRecord[], type: 'standup' | 'learning') => {
    records.forEach(record => {
      if (!record.scheduled_at) return;

      const date = record.scheduled_at.toDate();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          standupsAttended: 0,
          standupsMissed: 0,
          standupsNotAvailable: 0,
          standupsAbsent: 0,
          learningHoursAttended: 0,
          learningHoursMissed: 0,
          learningHoursNotAvailable: 0,
          learningHoursAbsent: 0,
        };
      }

      if (type === 'standup') {
        if (record.status === 'Present') monthlyStats[monthKey].standupsAttended++;
        else if (record.status === 'Missed') monthlyStats[monthKey].standupsMissed++;
        else if (record.status === 'Not Available') monthlyStats[monthKey].standupsNotAvailable++;
        else if (record.status === 'Absent') monthlyStats[monthKey].standupsAbsent++;
      } else {
        if (record.status === 'Present') monthlyStats[monthKey].learningHoursAttended++;
        else if (record.status === 'Missed') monthlyStats[monthKey].learningHoursMissed++;
        else if (record.status === 'Not Available') monthlyStats[monthKey].learningHoursNotAvailable++;
        else if (record.status === 'Absent') monthlyStats[monthKey].learningHoursAbsent++;
      }
    });
  };

  processRecords(standupRecords, 'standup');
  processRecords(learningRecords, 'learning');

  return monthlyStats;
};

// --- Components ---
const AttendanceProgressBar = ({ percentage }: { percentage: number }) => {
  const colorClass = useMemo(() => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [percentage]);

  return (
    <Progress
      value={percentage}
      className="h-2 [&>div]:bg-primary" // Keep this structure for radix
      indicatorClassName={colorClass}
    />
  );
};

const StatBlock = ({ title, attended, missed, notAvailable, absent }: { title: string; attended: number; missed: number; notAvailable: number; absent: number }) => {
  const considered = attended + missed;
  const totalConducted = considered + notAvailable + absent;
  const percentage = considered > 0 ? Math.round((attended / considered) * 100) : 0;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">Total : <span className="font-bold text-primary">{totalConducted}</span></p>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-lg font-bold">{attended}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Missed</p>
              <p className="text-lg font-bold">{missed}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Not Available</p>
              <p className="text-lg font-bold">{notAvailable}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-lg font-bold">{absent}</p>
            </div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-end mb-1">
            <h5 className="text-sm font-medium text-muted-foreground">Attendance</h5>
            <p className="font-bold">{percentage}%</p>
          </div>
          <AttendanceProgressBar percentage={percentage} />
        </div>
      </div>
    </div>
  );
};


export default function AttendanceSummaryCard({ employeeId }: AttendanceSummaryCardProps) {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    const fetchAndProcessAttendance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const standupQuery = query(collection(db, 'attendance'), where('employee_id', '==', employeeId));
        const standupSnapshot = await getDocs(standupQuery);
        const standupRecords = standupSnapshot.docs.map(doc => doc.data() as AttendanceRecord);

        const learningQuery = query(collection(db, 'learning_hours_attendance'), where('employee_id', '==', employeeId));
        const learningSnapshot = await getDocs(learningQuery);
        const learningRecords = learningSnapshot.docs.map(doc => doc.data() as AttendanceRecord);

        const stats = processAttendanceRecords(standupRecords, learningRecords);
        setMonthlyStats(stats);
      } catch (err) {
        console.error('Failed to fetch attendance stats:', err);
        setError('Could not load attendance data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndProcessAttendance();
  }, [employeeId]);

  const availableMonths = useMemo(() => {
    if (!monthlyStats) return [];
    return Object.keys(monthlyStats).sort((a, b) => b.localeCompare(a));
  }, [monthlyStats]);

  const currentStats = useMemo(() => {
    return monthlyStats?.[selectedMonth] || { standupsAttended: 0, standupsMissed: 0, standupsNotAvailable: 0, standupsAbsent: 0, learningHoursAttended: 0, learningHoursMissed: 0, learningHoursNotAvailable: 0, learningHoursAbsent: 0 };
  }, [monthlyStats, selectedMonth]);

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Summary</CardTitle>
        <CardDescription>Overall performance for the selected month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading || availableMonths.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder="Select a month" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map(month => (
              <SelectItem key={month} value={month}>
                {formatMonthYear(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-red-500 text-center py-4">{error}</p>
        ) : availableMonths.length > 0 ? (
          <div className="space-y-4">
            <StatBlock
              title="Standups"
              attended={currentStats.standupsAttended}
              missed={currentStats.standupsMissed}
              notAvailable={currentStats.standupsNotAvailable}
              absent={currentStats.standupsAbsent}
            />
            <StatBlock
              title="Learning Hours"
              attended={currentStats.learningHoursAttended}
              missed={currentStats.learningHoursMissed}
              notAvailable={currentStats.learningHoursNotAvailable}
              absent={currentStats.learningHoursAbsent}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No attendance data for this month.</p>
        )}
      </CardContent>
    </Card>
  );
}
