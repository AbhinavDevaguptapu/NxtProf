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
                const feedbackQuery = query(collection(db, "givenPeerFeedback"), where("requesterId", "==", user.uid));

                const [employeesSnapshot, requestsSnapshot, feedbackSnapshot] = await Promise.all([
                    getDocs(employeesQuery),
                    getDocs(requestsQuery),
                    getDocs(feedbackQuery),
                ]);

                const requestedIds = new Set(requestsSnapshot.docs.map(doc => doc.data().targetId));
                const feedbackGivenIds = new Set(feedbackSnapshot.docs.map(doc => doc.data().targetId));

                const categorizedEmployees: EmployeeWithStatus[] = employeesSnapshot.docs
                    .filter(doc => !feedbackGivenIds.has(doc.id)) // Filter out users who already gave feedback
                    .map((doc) => ({
                        id: doc.id,
                        name: doc.data().name,
                        status: requestedIds.has(doc.id) ? 'requested' : 'available',
                    }));

                // Sort by status first, then by name
                categorizedEmployees.sort((a, b) => {
                    if (a.status !== b.status) {
                        return a.status === 'available' ? -1 : 1;
                    }
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
        if (!user) {
            toast.error("You must be logged in to send requests.");
            return;
        }

        try {
            // 1. Re-fetch the list of colleagues who have already provided feedback to be certain.
            const feedbackQuery = query(collection(db, "givenPeerFeedback"), where("requesterId", "==", user.uid));
            const feedbackSnapshot = await getDocs(feedbackQuery);
            const feedbackGivenIds = new Set(feedbackSnapshot.docs.map(doc => doc.data().targetId));

            // 2. Determine which selected colleagues to send requests to and which to skip.
            const idsToSend = values.targetIds.filter(id => !feedbackGivenIds.has(id));
            const idsToSkip = values.targetIds.filter(id => feedbackGivenIds.has(id));

            // 3. Notify the user if any selected colleagues were skipped.
            if (idsToSkip.length > 0) {
                const skippedNames = employees
                    .filter(emp => idsToSkip.includes(emp.id))
                    .map(emp => emp.name)
                    .join(', ');
                toast.info(`Skipped requests for ${skippedNames}, as they've already given feedback.`);
            }

            // 4. If there are no valid new requests to send, exit early.
            if (idsToSend.length === 0) {
                form.reset(); // Reset form fields
                return;
            }

            // 5. Create promises only for the valid colleagues.
            const promises = idsToSend.map(targetId =>
                requestPeerFeedback({ targetId, message: values.message })
            );

            // 6. Use toast.promise for user feedback on the API call.
            await toast.promise(Promise.all(promises), {
                loading: `Sending ${idsToSend.length} feedback request(s)...`,
                success: () => {
                    // 7. On success, update the local UI state ONLY for the colleagues who were actually requested.
                    setEmployees(prev => {
                        const updated: EmployeeWithStatus[] = prev.map(emp =>
                            idsToSend.includes(emp.id) // IMPORTANT: Use idsToSend here
                                ? { ...emp, status: 'requested' }
                                : emp
                        );
                        // Re-sort the list to move newly requested users down
                        return updated.sort((a, b) => {
                            if (a.status !== b.status) {
                                return a.status === 'available' ? -1 : 1;
                            }
                            return a.name.localeCompare(b.name);
                        });
                    });
                    form.reset();
                    return `${idsToSend.length} request(s) sent successfully!`;
                },
                error: (err) => `Failed to send requests: ${err.message}`,
            });

        } catch (error) {
            console.error("Error during feedback request submission:", error);
            toast.error("An unexpected error occurred. Please try again.");
        }
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