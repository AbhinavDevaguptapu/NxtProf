import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserMinus, Info } from "lucide-react";
import type { Employee } from "../types";

export const AbsenceReasonModal = ({
  employee,
  isOpen,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeId: string, reason: string) => void;
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  if (!isOpen || !employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <UserMinus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl">Mark as Unavailable</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-1">
            Specify a reason for{" "}
            <span className="font-semibold text-foreground">
              {employee.name}&apos;s
            </span>{" "}
            absence. This will be visible in the roster.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="absence-reason" className="text-sm font-semibold">
              Reason for Absence
            </Label>
            <Textarea
              id="absence-reason"
              placeholder="e.g., On sick leave, Urgent client meeting, Planned vacation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px] resize-none focus-visible:ring-amber-500/20"
            />
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              This status does not count as "Absent" in analytics but excludes
              them from the attendance count.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="h-11">
            Cancel
          </Button>
          <Button
            onClick={() => onSave(employee.id, reason)}
            disabled={!reason.trim()}
            className="h-11 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Save Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
