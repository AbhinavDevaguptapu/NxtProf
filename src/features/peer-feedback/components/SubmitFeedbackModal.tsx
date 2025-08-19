import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUserAuth } from "@/context/UserAuthContext";
import { Employee } from "../types";
import RatingInput from "./RatingInput";
import { useState } from "react";

const functions = getFunctions();
const givePeerFeedback = httpsCallable(functions, 'peerFeedback-givePeerFeedback');

const formSchema = z.object({
    projectOrTask: z.string().min(3, "Project or task must be at least 3 characters."),
    workEfficiency: z.string().min(1, "You must select a rating."),
    easeOfWork: z.string().min(1, "You must select a rating."),
    remarks: z.string().min(10, "Remarks must be at least 10 characters.").max(2000),
});

interface SubmitFeedbackModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    targetEmployee: Employee;
    onFeedbackSubmitted: () => void;
}

const SubmitFeedbackModal = ({ isOpen, onOpenChange, targetEmployee, onFeedbackSubmitted }: SubmitFeedbackModalProps) => {
    const { user } = useUserAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectOrTask: "",
            remarks: "",
            workEfficiency: "",
            easeOfWork: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast.error("You must be logged in to submit feedback.");
            return;
        }
        setIsSubmitting(true);

        const payload = {
            ...values,
            giverId: user.uid,
            targetId: targetEmployee.id,
            workEfficiency: parseInt(values.workEfficiency, 10),
            easeOfWork: parseInt(values.easeOfWork, 10),
        };

        try {
            await toast.promise(givePeerFeedback(payload), {
                loading: "Submitting your feedback...",
                success: () => {
                    onFeedbackSubmitted();
                    return "Feedback submitted successfully!";
                },
                error: (err) => `Failed to submit: ${err.message}`,
            });
        } catch (error) {
            console.error("Submission failed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Give Feedback to {targetEmployee.name}</DialogTitle>
                    <DialogDescription>
                        Your feedback will be submitted anonymously. Please be constructive and respectful.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="projectOrTask"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project or Task</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Q2 Marketing Campaign" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <RatingInput
                                control={form.control}
                                name="workEfficiency"
                                label="Work Efficiency"
                            />
                            <RatingInput
                                control={form.control}
                                name="easeOfWork"
                                label="Ease of Collaboration"
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="remarks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remarks</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Provide your anonymous feedback here..."
                                            rows={4}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    "Submit Anonymously"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SubmitFeedbackModal;
