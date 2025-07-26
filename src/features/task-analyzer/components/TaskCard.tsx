import React, { useState } from 'react';
import { Task } from '../types';
import { CheckCircle, XCircle, FileText, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Local definition for AnalysisStatus since types.ts is not found
export enum AnalysisStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

interface TaskCardProps {
  task: Task;
}

const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
    const getScoreColor = () => {
        if (score >= 75) return 'bg-green-500 hover:bg-green-600';
        if (score >= 50) return 'bg-yellow-500 hover:bg-yellow-600';
        return 'bg-red-500 hover:bg-red-600';
    };

    return (
        <Badge className={`text-white transition-colors ${getScoreColor()}`}>
            {score}% Match
        </Badge>
    );
};

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const { taskData, analysis, status } = task;

  const renderContent = () => {
    switch (status) {
      case AnalysisStatus.PENDING:
      case AnalysisStatus.ANALYZING:
        return (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Analyzing...</p>
          </div>
        );
      case AnalysisStatus.SKIPPED:
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <p className="font-semibold">Analysis Skipped</p>
            <p className="text-xs text-muted-foreground mt-1">This task was not analyzed.</p>
          </div>
        );
      case AnalysisStatus.FAILED:
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mb-2"/>
            <p className="font-semibold text-destructive">Analysis Failed</p>
            <p className="text-xs text-muted-foreground mt-1">Could not evaluate this task.</p>
          </div>
        );
      case AnalysisStatus.COMPLETED:
        if (!analysis) return null;
        return (
          <>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-bold flex-1 pr-2">
                  {taskData.taskFrameworkCategory || 'Uncategorized'}
                </CardTitle>
                <ScoreBadge score={analysis.matchPercentage} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground italic mb-4">{analysis.rationale}</p>

              <div className="bg-muted/50 p-3 rounded-lg mb-4 border">
                  <h4 className="flex items-center text-xs font-semibold uppercase text-muted-foreground mb-2">
                      <FileText className="w-4 h-4 mr-2" />
                      Original Task
                  </h4>
                  <p className="font-medium text-sm">
                      {taskData.task}
                  </p>
              </div>

              { (taskData.situation || taskData.behavior || taskData.impact || taskData.action) &&
                  <div>
                      <button 
                          onClick={() => setIsDetailsVisible(!isDetailsVisible)}
                          className="flex items-center text-sm font-medium text-primary hover:underline focus:outline-none w-full text-left"
                      >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {isDetailsVisible ? 'Hide SBI-A Details' : 'Show SBI-A Details'}
                          {isDetailsVisible ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                      </button>

                      {isDetailsVisible && (
                          <div className="mt-3 pl-4 border-l-2 border-primary/20 space-y-3 text-sm text-muted-foreground">
                              {taskData.situation && <div><strong className="font-semibold text-foreground">Situation:</strong> {taskData.situation}</div>}
                              {taskData.behavior && <div><strong className="font-semibold text-foreground">Behavior:</strong> {taskData.behavior}</div>}
                              {taskData.impact && <div><strong className="font-semibold text-foreground">Impact:</strong> {taskData.impact}</div>}
                              {taskData.action && <div><strong className="font-semibold text-foreground">Action Item:</strong> {taskData.action}</div>}
                          </div>
                      )}
                  </div>
              }
            </CardContent>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col transition-shadow hover:shadow-md">
      {renderContent()}
    </Card>
  );
};

export default TaskCard;