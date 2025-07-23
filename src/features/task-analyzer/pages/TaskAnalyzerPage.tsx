import React, { useState, useEffect } from 'react';
import AnalysisPage from '../components/AnalysisPage';
import AppNavbar from '@/components/common/AppNavbar';
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, Users } from 'lucide-react';
import { Employee } from '../types';
import { getSubsheetNames } from '../services/sheetService';
import { Card, CardContent } from '@/components/ui/card';
import ErrorDisplay from '../components/ErrorDisplay';

const TaskAnalyzerPage: React.FC = () => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSheets, setEmployeeSheets] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const sheets = await getSubsheetNames();
        setEmployeeSheets(sheets);

        if (!admin && sheets.length > 0) {
          setSelectedEmployee(sheets[0]);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to fetch employee data.';
        setError(errorMessage.includes('permission-denied') ? 'permission-denied' : errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployeeData();
  }, [admin]);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (error) {
      return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
    }

    if (admin) {
      return (
        <AnalysisPage
          isAdminView
          employees={employeeSheets}
          selectedEmployee={selectedEmployee}
          onEmployeeSelect={handleEmployeeSelect}
          onBack={() => navigate('/')}
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

    return <AnalysisPage selectedEmployee={selectedEmployee} onBack={() => navigate('/')} />;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavbar />
      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col">
        {renderContent()}
      </main>
    </div>
  );
};

export default TaskAnalyzerPage;