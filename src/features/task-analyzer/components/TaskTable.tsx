import React from 'react';
import { Task } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TaskTableProps {
  tasks: Task[];
  selectedDate: string;
}

const TaskTable: React.FC<TaskTableProps> = ({ tasks, selectedDate }) => {
  if (tasks.length === 0) {
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Tasks for {selectedDate}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">No tasks recorded for this date.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Tasks for {selectedDate}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Task</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Point Type</TableHead>
                <TableHead className="min-w-[200px]">Situation (S)</TableHead>
                <TableHead className="min-w-[200px]">Behavior (B)</TableHead>
                <TableHead className="min-w-[200px]">Impact (I)</TableHead>
                <TableHead className="min-w-[200px]">Action (A)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.taskData.task || '-'}</TableCell>
                  <TableCell>{task.taskData.taskFrameworkCategory || '-'}</TableCell>
                  <TableCell>{task.taskData.pointType || '-'}</TableCell>
                  <TableCell>{task.taskData.situation || '-'}</TableCell>
                  <TableCell>{task.taskData.behavior || '-'}</TableCell>
                  <TableCell>{task.taskData.impact || '-'}</TableCell>
                  <TableCell>{task.taskData.action || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskTable;