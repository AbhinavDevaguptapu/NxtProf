import React, { useState, useEffect, useMemo } from 'react';
import { getSheetData} from '../services/sheetService';
import { analyzeTask } from '../services/geminiService';
import { Task, TaskData, Employee } from '../types';
import TaskCard from './TaskCard';

// Local definition for AnalysisStatus since types.ts is not found
export enum AnalysisStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

import TaskTable from './TaskTable';
import { Loader2, CheckCircle, XCircle, Calendar as CalendarIcon, ArrowLeft, Users } from 'lucide-react';
import ErrorDisplay from './ErrorDisplay';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AnalysisPageProps {
  isAdminView?: boolean;
  employees?: Employee[];
  selectedEmployee: Employee | null;
  onEmployeeSelect?: (employee: Employee) => void;
  onBack?: () => void;
}

const AnalysisPage: React.FC<AnalysisPageProps> = ({
  isAdminView = false,
  employees = [],
  selectedEmployee,
  onEmployeeSelect,
  onBack,
}) => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [analyzedTasks, setAnalyzedTasks] = useState<Task[]>([]);
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string>('');

  const employeeName = selectedEmployee?.name;

  useEffect(() => {
    const fetchTaskData = async () => {
      if (!selectedEmployee) {
        setAllTasks([]);
        setUniqueDates([]);
        setSelectedDate('');
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      setProcessingMessage(`Fetching tasks for ${selectedEmployee.name}...`);

      try {
        const taskData: TaskData[] = await getSheetData(selectedEmployee.sheetName);

        if (taskData.length === 0) {
          setError('No tasks found in the sheet.');
          setAllTasks([]);
          setUniqueDates([]);
          return;
        }

        const tasks: Task[] = taskData.map(data => ({
          id: data.id,
          taskData: data,
          analysis: null,
          status: AnalysisStatus.PENDING,
        }));
        setAllTasks(tasks);

        const dates = [...new Set(tasks.map(t => t.taskData.date))]
          .filter(date => date)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        setUniqueDates(dates);

        // Initially, don't select any date
        setSelectedDate('');

      } catch (e) {
        console.error(e);
        setError("An error occurred while loading the analysis. Please try again.");
      } finally {
        setIsLoading(false);
        setProcessingMessage('');
      }
    };

    fetchTaskData();
  }, [selectedEmployee]);

  useEffect(() => {
    const processTasksForDate = async () => {
      if (!selectedDate) {
        setAnalyzedTasks([]);
        return;
      }

      const tasksToProcess = allTasks.filter(t => t.taskData.date === selectedDate);
      setAnalyzedTasks(tasksToProcess.map(t => ({ ...t, status: AnalysisStatus.PENDING })));

      if (tasksToProcess.length === 0) return;

      for (let i = 0; i < tasksToProcess.length; i++) {
        const task = tasksToProcess[i];
        
        if (task.taskData.pointType !== 'R1' && task.taskData.pointType !== 'R2') {
          setAnalyzedTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: AnalysisStatus.SKIPPED } : t));
          continue; // Skip to the next task
        }

        setProcessingMessage(`Analyzing task ${i + 1} of ${tasksToProcess.length}...`);
        setAnalyzedTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: AnalysisStatus.ANALYZING } : t));

        try {
          const analysis = await analyzeTask(task.taskData);
          setAnalyzedTasks(prev => prev.map(t => t.id === task.id ? { ...t, analysis, status: AnalysisStatus.COMPLETED } : t));
        } catch (e) {
          console.error(`Failed to analyze task ${task.id}:`, e);
          setAnalyzedTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: AnalysisStatus.FAILED } : t));
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setProcessingMessage('Analysis complete!');
      setTimeout(() => setProcessingMessage(''), 3000);
    };

    processTasksForDate();
  }, [selectedDate, allTasks]);

  const tasksForSelectedDate = useMemo(() => allTasks.filter(t => t.taskData.date === selectedDate), [selectedDate, allTasks]);
  const analyzedCount = useMemo(() => analyzedTasks.filter(t => t.status === AnalysisStatus.COMPLETED).length, [analyzedTasks]);
  const failedCount = useMemo(() => analyzedTasks.filter(t => t.status === AnalysisStatus.FAILED).length, [analyzedTasks]);
  const totalToAnalyze = useMemo(() => tasksForSelectedDate.filter(t => t.taskData.pointType === 'R1' || t.taskData.pointType === 'R2').length, [tasksForSelectedDate]);
  const isProcessing = useMemo(() => analyzedTasks.some(t => t.status === AnalysisStatus.ANALYZING), [analyzedTasks]);
  const progress = totalToAnalyze > 0 ? ((analyzedCount + failedCount) / totalToAnalyze) * 100 : 0;

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee && onEmployeeSelect) {
      onEmployeeSelect(employee);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Task Analysis {isAdminView && selectedEmployee ? `for ${employeeName}` : ''}</h1>
          <p className="text-muted-foreground">{isAdminView ? 'Select an employee and date to view their analysis.' : 'Select a date to view your analysis.'}</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 pt-2">
          {isAdminView && (
            <Select onValueChange={handleEmployeeSelect} value={selectedEmployee?.id || ''}>
              <SelectTrigger className="w-full md:w-[240px]">
                <Users className="mr-2 h-4 w-4" />
                <SelectValue placeholder="-- Select Employee --" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select onValueChange={setSelectedDate} value={selectedDate} disabled={isProcessing || !selectedEmployee}>
              <SelectTrigger className="w-full md:w-[240px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="-- Select a date --" />
              </SelectTrigger>
              <SelectContent>
                  {uniqueDates.map(date => (
                      <SelectItem key={date} value={date}>{date}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{processingMessage || 'Loading tasks...'}</p>
        </div>
      )}

      {error && <ErrorDisplay message={error} onRetry={onBack} />}

      {!isLoading && !error && !selectedEmployee && isAdminView && (
        <Card className="h-full flex items-center justify-center border-2 border-dashed">
            <CardContent className="text-center py-10">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold mt-4">Select an Employee</h2>
                <p className="text-muted-foreground mt-1">Choose an employee from the dropdown above to begin.</p>
            </CardContent>
        </Card>
      )}

      {!isLoading && !error && selectedEmployee && (
        <>
          {selectedDate ? (
            <>
              <TaskTable tasks={tasksForSelectedDate} selectedDate={selectedDate} />

              {(isProcessing || analyzedTasks.length > 0) && (
                  <Card>
                  <CardHeader>
                      <CardTitle>Analysis for {selectedDate}</CardTitle>
                      <CardDescription>{processingMessage}</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="flex items-center space-x-4 mb-4">
                      <div className="flex items-center text-green-500">
                          <CheckCircle className="w-5 h-5 mr-1.5" />
                          <span>Analyzed: {analyzedCount}/{totalToAnalyze}</span>
                      </div>
                      {failedCount > 0 && (
                          <div className="flex items-center text-red-500">
                          <XCircle className="w-5 h-5 mr-1.5" />
                          <span>Failed: {failedCount}</span>
                          </div>
                      )}
                      </div>
                      {(isProcessing || progress < 100) && <Progress value={progress} />}
                  </CardContent>
                  </Card>
              )}

              <div className="space-y-6">
                  {analyzedTasks.map((task, index) => (
                  <div key={task.id} className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                      <TaskCard task={task} />
                  </div>
                  ))}
              </div>
            </>
          ) : (
            <Card className="h-full flex items-center justify-center border-2 border-dashed">
              <CardContent className="text-center py-10">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold mt-4">Select a Date</h2>
                <p className="text-muted-foreground mt-1">Choose a date from the dropdown above to begin the analysis.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AnalysisPage;
