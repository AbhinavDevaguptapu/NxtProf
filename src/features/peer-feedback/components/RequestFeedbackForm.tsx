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

const functions = getFunctions();
const requestPeerFeedback = httpsCallable(functions, 'peerFeedback-requestPeerFeedback');

const formSchema = z.object({
    targetIds: z.array(z.string()).min(1, "You must select at least one colleague."),
    message: z.string().min(10, "Message must be at least 10 characters.").max(500, "Message must be 500 characters or less."),
});

interface EmployeeWithStatus {
    id: string;
    name: string;
    status: 'available' | 'requested' | 'completed';
}

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

                const feedbackGivenIds = new Set(feedbackSnapshot.docs.map(doc => doc.data().giverId));
                const requestedIds = new Set(requestsSnapshot.docs.map(doc => doc.data().targetId));

                const categorizedEmployees: EmployeeWithStatus[] = employeesSnapshot.docs.map((doc) => {
                    const employeeId = doc.id;
                    let status: EmployeeWithStatus['status'];

                    if (feedbackGivenIds.has(employeeId)) {
                        status = 'completed';
                    } else if (requestedIds.has(employeeId)) {
                        status = 'requested';
                    } else {
                        status = 'available';
                    }

                    return {
                        id: employeeId,
                        name: doc.data().name,
                        status: status,
                    };
                });

                const statusOrder = { available: 1, requested: 2, completed: 3 };
                categorizedEmployees.sort((a, b) => {
                    const orderA = statusOrder[a.status];
                    const orderB = statusOrder[b.status];
                    if (orderA !== orderB) {
                        return orderA - orderB;
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

    const availableEmployeesCount = useMemo(() => {
        return employees.filter(e => e.status === 'available').length;
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return employees;
        return employees.filter(employee =>
            employee.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [employees, searchQuery]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast.error("You must be logged in to send requests.");
            return;
        }

        const toastId = toast.loading(`Sending ${values.targetIds.length} feedback request(s)...`);

        try {
            const promises = values.targetIds.map(targetId =>
                requestPeerFeedback({ targetId, message: values.message })
            );

            await Promise.all(promises);

            toast.success(`${values.targetIds.length} request(s) sent successfully!`, { id: toastId });

            setEmployees(prev => {
                const updated = prev.map(emp =>
                    values.targetIds.includes(emp.id)
                        ? { ...emp, status: 'requested' as const }
                        : emp
                );
                const statusOrder = { available: 1, requested: 2, completed: 3 };
                return updated.sort((a, b) => {
                    const orderA = statusOrder[a.status];
                    const orderB = statusOrder[b.status];
                    if (orderA !== orderB) return orderA - orderB;
                    return a.name.localeCompare(b.name);
                });
            });
            form.reset();

        } catch (error: any) {
            console.error("Error during feedback request submission:", error);
            toast.error(`Failed to send requests: ${error.message}`, { id: toastId });
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
                                {!isLoading && (
                                    <span className="text-sm text-muted-foreground">
                                        {availableEmployeesCount} colleagues available
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
                                        <div className="flex items-center justify-center h-full pt-10">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((employee) => (
                                            <FormField
                                                key={employee.id}
                                                control={form.control}
                                                name="targetIds"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-4">
                                                        <FormControl>
                                                            <Checkbox
                                                                disabled={employee.status !== 'available'}
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
                                                        {/* **THE CHANGE IS HERE:** The badges are removed. */}
                                                        <FormLabel className={`font-normal cursor-pointer ${employee.status !== 'available' ? 'text-muted-foreground line-through' : ''}`}>
                                                            {employee.name}
                                                        </FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full pt-8">
                                            <UserX className="h-8 w-8 mb-2" />
                                            <p className="font-semibold">{searchQuery ? "No Matches Found" : "No Available Colleagues"}</p>
                                            <p className="text-xs">
                                                {searchQuery ? "Try a different search term." : "All colleagues have either been requested or have completed feedback."}
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
                                    placeholder="e.g., 'Could you please provide feedback on my presentation skills...'"
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
