import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useUserAuth } from "@/context/UserAuthContext";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from "sonner";
import { Search, Loader2, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Initialize Firebase Functions
const functions = getFunctions();
const requestPeerFeedback = httpsCallable(functions, 'peerFeedback-requestPeerFeedback');

// Zod schema for form validation
const formSchema = z.object({
    targetIds: z.array(z.string()).min(1, "You must select at least one colleague."),
    message: z.string().min(10, "Message must be at least 10 characters.").max(500, "Message must be 500 characters or less."),
});

// Interface now includes a status for each employee
interface EmployeeWithStatus {
    id: string;
    name: string;
    status: 'available' | 'requested';
}

/**
 * A form for users to request peer feedback from their colleagues.
 * It disables and labels colleagues who have already been requested,
 * and sorts available colleagues to the top.
 */
const RequestFeedbackForm = () => {
    const { user } = useUserAuth();
    const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetIds: [],
            message: "",
        },
    });

    // Effect to fetch employees and their feedback request status
    useEffect(() => {
        const fetchAndCategorizeEmployees = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const employeesQuery = query(collection(db, "employees"), where(documentId(), "!=", user.uid));
                const requestsQuery = query(collection(db, "peerFeedbackRequests"), where("requesterId", "==", user.uid));
                const feedbackQuery = query(collection(db, "givenPeerFeedback"), where("targetId", "==", user.uid));

                const [employeesSnapshot, requestsSnapshot, feedbackSnapshot] = await Promise.all([
                    getDocs(employeesQuery),
                    getDocs(requestsQuery),
                    getDocs(feedbackQuery),
                ]);

                const requestedIds = new Set(requestsSnapshot.docs.map(doc => doc.data().targetId));
                const feedbackGivenIds = new Set(feedbackSnapshot.docs.map(doc => doc.data().requesterId));

                const categorizedEmployees: EmployeeWithStatus[] = employeesSnapshot.docs
                    .filter(doc => !feedbackGivenIds.has(doc.id)) // Filter out users who already gave feedback
                    .map((doc) => ({
                        id: doc.id,
                        name: doc.data().name,
                        status: requestedIds.has(doc.id) ? 'requested' : 'available',
                    }));

                // Sort by status first, then by name
                categorizedEmployees.sort((a, b) => {
                    // 'available' users come before 'requested' users
                    if (a.status !== b.status) {
                        return a.status === 'available' ? -1 : 1;
                    }
                    // If statuses are the same, sort alphabetically by name
                    return a.name.localeCompare(b.name);
                });

                setEmployees(categorizedEmployees);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load employee list.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndCategorizeEmployees();
    }, [user]);

    // Memoized list of employees filtered by the search query
    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return employees;
        return employees.filter(employee =>
            employee.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [employees, searchQuery]);

    // Form submission handler
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const promises = values.targetIds.map(targetId =>
            requestPeerFeedback({ targetId, message: values.message })
        );

        await toast.promise(Promise.all(promises), {
            loading: `Sending ${promises.length} feedback request(s)...`,
            success: () => {
                // On success, update the status of sent employees and re-sort the list
                setEmployees(prev => {
                    // FIX: Explicitly type the 'updated' constant to avoid type inference issues.
                    const updated: EmployeeWithStatus[] = prev.map(emp =>
                        values.targetIds.includes(emp.id)
                            ? { ...emp, status: 'requested' }
                            : emp
                    );
                    // Re-sort the list to move newly requested users to the bottom
                    return updated.sort((a, b) => {
                        if (a.status !== b.status) {
                            return a.status === 'available' ? -1 : 1;
                        }
                        return a.name.localeCompare(b.name);
                    });
                });
                form.reset();
                return `Request(s) sent successfully!`;
            },
            error: (err) => `Failed to send requests: ${err.message}`,
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="targetIds"
                    render={() => (
                        <FormItem>
                            <div className="flex justify-between items-center mb-2">
                                <FormLabel>Select Colleagues</FormLabel>
                                {!isLoading && employees.length > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        {employees.length} colleagues
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search for a colleague..."
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                    disabled={isLoading || employees.length === 0}
                                />
                            </div>
                            <ScrollArea className="h-48 w-full rounded-md border">
                                <div className="p-4">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((employee) => (
                                            <FormField
                                                key={employee.id}
                                                control={form.control}
                                                name="targetIds"
                                                render={({ field }) => (
                                                    <FormItem
                                                        key={employee.id}
                                                        className="flex flex-row items-center space-x-3 space-y-0 mb-4"
                                                    >
                                                        <FormControl>
                                                            <Checkbox
                                                                disabled={employee.status === 'requested'}
                                                                checked={field.value?.includes(employee.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const currentIds = field.value || [];
                                                                    const newIds = checked
                                                                        ? [...currentIds, employee.id]
                                                                        : currentIds.filter(id => id !== employee.id);
                                                                    field.onChange(newIds);
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className={`font-normal cursor-pointer ${employee.status === 'requested' ? 'text-muted-foreground' : ''}`}>
                                                            {employee.name}
                                                        </FormLabel>
                                                        {employee.status === 'requested' && (
                                                            <Badge variant="secondary" className="ml-auto">Requested</Badge>
                                                        )}
                                                    </FormItem>
                                                )}
                                            />
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full pt-8">
                                            <UserX className="h-8 w-8 mb-2" />
                                            <p className="font-semibold">No Colleagues Found</p>
                                            <p className="text-xs">
                                                Your search returned no results.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Message</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="e.g., 'Could you please provide feedback on my presentation skills during the last team meeting?'"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {form.formState.isSubmitting ? "Sending..." : "Send Request(s)"}
                </Button>
            </form>
        </Form>
    );
};

export default RequestFeedbackForm;
