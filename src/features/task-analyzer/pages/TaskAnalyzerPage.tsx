import React, { useState, useEffect } from 'react';
import AnalysisPage from '../components/AnalysisPage';
import { useUserAuth } from "@/context/UserAuthContext";
import { Loader2, Users } from 'lucide-react';
import { Employee } from '../types';
import { getEmployees } from '../services/employeeService';
import { Card, CardContent } from '@/components/ui/card';
import ErrorDisplay from '../components/ErrorDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewState, ViewType } from '@/layout/AppShell';

interface TaskAnalyzerPageProps {
  setActiveView: (view: ViewState) => void;
}

const TaskAnalyzerPage: React.FC<TaskAnalyzerPageProps> = ({ setActiveView }) => {
  const { user, userProfile, isAdmin, isCoAdmin } = useUserAuth();

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSheets, setEmployeeSheets] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployeeData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isAdmin || isCoAdmin) {
        const employees = await getEmployees();
        setEmployeeSheets(employees);
      } else if (user) {
        // Regular users see their own analysis directly.
        setSelectedEmployee({ id: user.uid, name: user?.displayName || 'My Analysis', sheetName: '' });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch employee data.';
      setError(errorMessage.includes('permission-denied') ? 'permission-denied' : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchEmployeeData();
    }
  }, [isAdmin, isCoAdmin, userProfile]);

  const handleEmployeeSelect = (employee: Employee | null) => {
    setSelectedEmployee(employee);
  };

  const renderContent = () => {
    if (error) {
      return <ErrorDisplay message={error} onRetry={fetchEmployeeData} />;
    }

    if (isAdmin || isCoAdmin) {
      return (
        <AnalysisPage
          isAdminView
          employees={employeeSheets}
          selectedEmployee={selectedEmployee}
          onEmployeeSelect={handleEmployeeSelect}
          onBack={() => handleEmployeeSelect(null)}
        />
      );
    }

    if (!selectedEmployee) {
      return (
        <Card className="h-full flex items-center justify-center border-2 border-dashed">
          <CardContent className="text-center py-10">
            <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mt-4">No Analysis Available</h2>
            <p className="text-muted-foreground mt-1">An analysis sheet has not been assigned to your account.</p>
          </CardContent>
        </Card>
      );
    }

    return <AnalysisPage selectedEmployee={selectedEmployee} />;
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Task Analysis</h1>
          <p className="text-muted-foreground">Select an employee and date to view their analysis.</p>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default TaskAnalyzerPage;