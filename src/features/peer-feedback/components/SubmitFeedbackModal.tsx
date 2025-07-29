
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const functions = getFunctions();
const submitPeerFeedback = httpsCallable(functions, 'peerFeedback-submitPeerFeedback');

const formSchema = z.object({
    projectOrTask: z.string().min(3, "Project or task must be at least 3 characters."),
    workEfficiency: z.string({ required_error: "You must select a rating." }),
    easeOfWork: z.string({ required_error: "You must select a rating." }),
    remarks: z.string().min(10, "Remarks must be at least 10 characters.").max(2000),
});

interface SubmitFeedbackModalProps {
    request: {
        id: string;
        requesterName: string;
    };
    onOpenChange: (open: boolean) => void;
    onFeedbackSubmitted: () => void;
}

const SubmitFeedbackModal = ({ request, onOpenChange, onFeedbackSubmitted }: SubmitFeedbackModalProps) => {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectOrTask: "",
            remarks: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const numericValues = {
            ...values,
            workEfficiency: parseInt(values.workEfficiency, 10),
            easeOfWork: parseInt(values.easeOfWork, 10),
        };
        await toast.promise(submitPeerFeedback({ requestId: request.id, ...numericValues }), {
            loading: "Submitting your feedback...",
            success: () => {
                onFeedbackSubmitted();
                return "Feedback submitted successfully!";
            },
            error: (err) => `Failed to submit: ${err.message}`,
        });
    };

    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Give Feedback to {request.requesterName}</DialogTitle>
                    <DialogDescription>
                        Your feedback will be submitted anonymously. Please be constructive and respectful.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="workEfficiency"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Work Efficiency</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-wrap gap-4"
                                            >
                                                {[1, 2, 3, 4, 5].map(value => (
                                                    <FormItem key={value} className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value={String(value)} />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{value}</FormLabel>
                                                    </FormItem>
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="easeOfWork"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Ease of Collaboration</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-wrap gap-4"
                                            >
                                                {[1, 2, 3, 4, 5].map(value => (
                                                    <FormItem key={value} className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value={String(value)} />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{value}</FormLabel>
                                                    </FormItem>
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
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
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Submitting..." : "Submit Anonymously"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SubmitFeedbackModal;
