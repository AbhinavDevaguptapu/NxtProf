import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  const friendlyMessage = (msg: string): { title: string; description: string } => {
    if (msg.includes('No data sheet found for')) {
      return {
        title: "Employee Data Not Found",
        description: "We couldn't find the specific data sheet for this employee."
      };
    }
    if (msg.includes('No tasks found in the sheet')) {
      return {
        title: "No Tasks to Analyze",
        description: "The employee's data sheet is empty or doesn't contain any tasks."
      };
    }
    if (msg.includes('permission-denied')) {
        return {
            title: "Permission Denied",
            description: "You do not have the necessary permissions to view this data."
        };
    }
    if (msg.includes('not-found')) {
        return {
            title: "Not Found",
            description: "The requested resource could not be found."
        };
    }
    return {
      title: "An Error Occurred",
      description: "Something went wrong. Please try again."
    };
  };

  const { title, description } = friendlyMessage(message);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {description}
          {onRetry && (
            <div className="mt-4">
              <Button onClick={onRetry} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ErrorDisplay;

