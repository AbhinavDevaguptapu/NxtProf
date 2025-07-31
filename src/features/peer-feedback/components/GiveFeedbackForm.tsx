import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUserAuth } from "@/context/UserAuthContext";
import { collection, getDocs, query, where, documentId, deleteDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

const functions = getFunctions();
const givePeerFeedback = httpsCallable(functions, 'peerFeedback-givePeerFeedback');

const formSchema = z.object({
    targetId: z.string().min(1, "You must select a colleague."),
    projectOrTask: z.string().min(3, "Project or task must be at least 3 characters."),
    workEfficiency: z.string().min(1, "You must select a rating."),
    easeOfWork: z.string().min(1, "You must select a rating."),
    remarks: z.string().min(10, "Remarks must be at least 10 characters.").max(2000),
});

interface Employee {
    id: string;
    name: string;
}

interface GiveFeedbackFormProps {
    onFeedbackSubmitted: () => void;
}

const GiveFeedbackForm = ({ onFeedbackSubmitted }: GiveFeedbackFormProps) => {
    const { user } = useUserAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetId: "",
            projectOrTask: "",
            remarks: "",
            workEfficiency: "",
            easeOfWork: "",
        },
    });

    useEffect(() => {
        const fetchAvailableEmployees = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const employeesQuery = query(collection(db, "employees"), where(documentId(), "!=", user.uid));
                const feedbackGivenQuery = query(collection(db, "givenPeerFeedback"), where("giverId", "==", user.uid));

                const [employeesSnapshot, feedbackGivenSnapshot] = await Promise.all([
                    getDocs(employeesQuery),
                    getDocs(feedbackGivenQuery),
                ]);

                const alreadyGivenToIds = new Set(feedbackGivenSnapshot.docs.map(doc => doc.data().targetId));

                const availableEmployees: Employee[] = [];
                employeesSnapshot.forEach((doc) => {
                    if (!alreadyGivenToIds.has(doc.id)) {
                        const data = doc.data();
                        if (data.name) {
                            availableEmployees.push({ id: doc.id, name: data.name });
                        }
                    }
                });

                setEmployees(availableEmployees);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load employee list.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAvailableEmployees();
    }, [user]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast.error("You must be logged in to give feedback.");
            return;
        }

        const payload = {
            ...values,
            giverId: user.uid,
            workEfficiency: parseInt(values.workEfficiency, 10),
            easeOfWork: parseInt(values.easeOfWork, 10),
        };

        await toast.promise(givePeerFeedback(payload), {
            loading: "Submitting feedback...",
            success: async () => {
                form.reset();
                setEmployees(prev => prev.filter(emp => emp.id !== values.targetId));

                // After giving feedback, check for and remove any pending requests from that user
                const requestsQuery = query(
                    collection(db, "peerFeedbackRequests"),
                    where("requesterId", "==", values.targetId),
                    where("targetId", "==", user.uid),
                    where("status", "==", "pending")
                );

                const requestsSnapshot = await getDocs(requestsQuery);
                requestsSnapshot.forEach(async (doc) => {
                    await deleteDoc(doc.ref);
                    console.log(`Deleted pending request ${doc.id}`);
                });
                
                onFeedbackSubmitted(); // This will trigger the refresh in the parent component

                return "Feedback submitted successfully! Pending requests cleared.";
            },
            error: (err) => `Failed to submit feedback: ${err.message}`,
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="targetId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Select Colleague</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || employees.length === 0}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                isLoading
                                                    ? "Loading colleagues..."
                                                    : employees.length > 0
                                                        ? "Select a colleague to give feedback to"
                                                        : "All colleagues have received feedback"
                                            }
                                        />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {employees.map((employee) => (
                                        <SelectItem key={employee.id} value={employee.id}>
                                            {employee.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
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
                    <FormField
                        control={form.control}
                        name="workEfficiency"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Work Efficiency</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
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
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
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
                                    placeholder="Provide your feedback here..."
                                    rows={4}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {form.formState.isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
            </form>
        </Form>
    );
};

export default GiveFeedbackForm;
