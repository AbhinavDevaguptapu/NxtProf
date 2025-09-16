import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { LearningPoint } from '../types';
import { Separator } from '@/components/ui/separator';

interface LearningPointSummaryModalProps {
  point: LearningPoint | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="py-3">
      <h4 className="font-semibold text-sm text-foreground">{label}</h4>
      <p className="text-sm text-muted-foreground break-words mt-1">{value}</p>
    </div>
  );
};

export const LearningPointSummaryModal: React.FC<LearningPointSummaryModalProps> = ({ point, isOpen, onClose }) => {
  if (!point) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-xl">{point.task_name}</DialogTitle>
          <DialogDescription>
            {point.createdAt ? format(point.createdAt.toDate(), 'PPP p') : 'Date not available'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-6 px-6 pb-6 space-y-2">
          <div className="flex items-center gap-2 flex-wrap py-2">
            <Badge variant="secondary">To: {point.recipient}</Badge>
            <Badge variant="default">{point.point_type}</Badge>
            <Badge variant="outline">{point.framework_category}</Badge>
            {point.subcategory && <Badge variant="outline">{point.subcategory}</Badge>}
          </div>
          
          <Separator />

          <div className="divide-y">
            <DetailRow label="Situation" value={point.situation} />
            <DetailRow label="Behavior" value={point.behavior} />
            <DetailRow label="Impact" value={point.impact} />
            <DetailRow label="Problem" value={point.problem} />
            <DetailRow label="Core Point Missed" value={point.core_point_missed} />
            {point.point_type !== 'R2' && (
              <DetailRow label="Action Item" value={point.action_item} />
            )}
          </div>

          {point.task_link && (
            <>
              <Separator />
              <div className="py-3">
                <h4 className="font-semibold text-sm text-foreground">Task Link</h4>
                <a
                  href={point.task_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline truncate block mt-1"
                >
                  {point.task_link}
                </a>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
