import React, { useState, useEffect } from 'react';
import { getSubsheetNames } from '../services/sheetService'; // Use the correct service
import { Employee } from '../types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ErrorDisplay from './ErrorDisplay';

interface LandingPageProps {
  onEmployeeSelect: (employee: Employee) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEmployeeSelect }) => {
  const [employeeSheetNames, setEmployeeSheetNames] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSheetNames = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch all subsheet names, which correspond to employee names.
        const sheetNames = await getSubsheetNames();
        setEmployeeSheetNames(sheetNames);
        // Set the default selection to the first employee if the list is not empty.
        if (sheetNames.length > 0) {
          setSelectedEmployee(sheetNames[0]);
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred while fetching the sheet names.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSheetNames();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployee) {
      onEmployeeSelect(selectedEmployee);
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Learning Hours Analysis</CardTitle>
          <CardDescription>Select an employee to begin the analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {error && (
              <ErrorDisplay message={error} onRetry={() => window.location.reload()} />
          )}

          {!isLoading && !error && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Select onValueChange={(employeeId) => {
                const employee = employeeSheetNames.find(emp => emp.id === employeeId);
                setSelectedEmployee(employee || null);
              }} value={selectedEmployee?.id || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeeSheetNames.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="submit" disabled={!selectedEmployee} className="w-full">
                Get Analysis
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LandingPage;
