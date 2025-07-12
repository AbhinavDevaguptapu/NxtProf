import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Employee } from "../types";

type AbsenceReasonModalProps = {
    employee: Employee | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, r: string) => void;
};

export const AbsenceReasonModal = ({ employee, isOpen, onClose, onSave }: AbsenceReasonModalProps) => {
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (isOpen) {
            setReason("");
        }
    }, [isOpen]);

    if (!isOpen || !employee) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reason for Unavailability: {employee.name}</DialogTitle>
                    <DialogDescription>Provide a brief reason why this member is unavailable for the session.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="absence-reason" className="sr-only">Reason</Label>
                    <Textarea
                        id="absence-reason"
                        placeholder="e.g., On leave, sick day, client meeting..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(employee.id, reason)}>Save Reason</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
