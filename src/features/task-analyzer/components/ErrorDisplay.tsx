import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  const friendlyMessage = (msg: string): { title: string; description: string } => {
    if (msg.includes('No data sheet found for')) {
      return {
        title: "Employee Data Not Found",
        description: "We couldn't find the specific data sheet for this employee. It might not have been created yet or there could be a configuration issue."
      };
    }
    if (msg.includes('No tasks found in the sheet')) {
      return {
        title: "No Tasks to Analyze",
        description: "The employee's data sheet is empty or doesn't contain any tasks in the expected format. Please add tasks to the sheet to begin the analysis."
      };
    }
    if (msg.includes('permission-denied')) {
        return {
            title: "Permission Denied",
            description: "You do not have the necessary permissions to view this data. Please contact an administrator if you believe this is an error."
        };
    }
    if (msg.includes('not-found')) {
        return {
            title: "Not Found",
            description: "The requested resource could not be found. It may have been moved or deleted."
        };
    }
    return {
      title: "An Unexpected Error Occurred",
      description: "We've encountered a problem. Please try again in a few moments. If the issue persists, contacting support can help us resolve it faster."
    };
  };

  const { title, description } = friendlyMessage(message);

  return (
    <Card className="w-full max-w-lg mx-auto my-8 border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center text-destructive">
          <AlertCircle className="mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground/80">{description}</p>
        {onRetry && (
          <div className="mt-6 flex justify-end">
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;
