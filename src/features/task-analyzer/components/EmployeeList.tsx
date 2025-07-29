import React from 'react';
import { Employee } from '../types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmployeeListProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  onSelectEmployee: (employee: Employee) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, selectedEmployee, onSelectEmployee }) => {
  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-1 pr-2">
        {employees.map((employee) => (
          <Button
            key={employee.id}
            variant={selectedEmployee?.id === employee.id ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onSelectEmployee(employee)}
          >
            {employee.name}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
};

export default EmployeeList;
