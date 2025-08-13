import { useState, useEffect } from 'react';
import { useAddObservation, useUpdateObservation } from '../hooks/useObservations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Observation } from '../types';

interface ObservationFormModalProps {
    observation?: Observation;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children?: React.ReactNode;
}

export const ObservationFormModal = ({ observation, open, onOpenChange, children }: ObservationFormModalProps) => {
    const isEditMode = !!observation;
    const [observationText, setObservationText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const addObservationMutation = useAddObservation();
    const updateObservationMutation = useUpdateObservation();
    const mutation = isEditMode ? updateObservationMutation : addObservationMutation;

    useEffect(() => {
        if (open) {
            setObservationText(isEditMode ? observation.observationText : '');
            setError(null);
        }
    }, [open, observation, isEditMode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (observationText.trim().length < 10) {
            setError("Observation must be 10+ characters.");
            return;
        }

        const onSuccess = () => onOpenChange(false);
        const onError = (err: any) => {
            const message = err.code === 'internal' ? "An unexpected error occurred." : err.message;
            setError(message);
        };

        if (isEditMode) {
            if (observationText.trim() !== observation.observationText) {
                updateObservationMutation.mutate({ id: observation.id, observationText: observationText.trim() }, { onSuccess, onError });
            } else {
                onOpenChange(false);
            }
        } else {
            addObservationMutation.mutate({ observationText: observationText.trim() }, { onSuccess, onError });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Observation' : 'Add Your Observation'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Make changes to your observation. You can only edit observations on the same day."
                            : "What did you observe today? Your observation must be at least 10 characters long."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="py-4">
                        <Textarea
                            placeholder="Enter your observation here..."
                            value={observationText}
                            onChange={(e) => {
                                setObservationText(e.target.value);
                                if (error) setError(null);
                            }}
                            rows={5}
                            disabled={mutation.isPending}
                            className={error ? 'border-destructive' : ''}
                        />
                        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={
                                mutation.isPending ||
                                observationText.trim().length < 10 ||
                                (isEditMode && observationText.trim() === observation.observationText)
                            }
                        >
                            {mutation.isPending ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Observation')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
