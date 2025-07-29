
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
import { Search } from "lucide-react";

const functions = getFunctions();
const requestPeerFeedback = httpsCallable(functions, 'peerFeedback-requestPeerFeedback');

const formSchema = z.object({
    targetIds: z.array(z.string()).min(1, "You must select at least one colleague."),
    message: z.string().min(10, "Message must be at least 10 characters.").max(500, "Message must be 500 characters or less."),
});

interface Employee {
    id: string;
    name: string;
}

const RequestFeedbackForm = () => {
    const { user } = useUserAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
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
        const fetchEmployees = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const q = query(collection(db, "employees"), where(documentId(), "!=", user.uid));
                const querySnapshot = await getDocs(q);
                const fetchedEmployees: Employee[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedEmployees.push({ id: doc.id, name: doc.data().name } as Employee);
                });
                setEmployees(fetchedEmployees.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Error fetching employees:", error);
                toast.error("Failed to load employee list.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEmployees();
    }, [user]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(employee =>
            employee.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [employees, searchQuery]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const promises = values.targetIds.map(targetId =>
            requestPeerFeedback({ targetId, message: values.message })
        );

        toast.promise(Promise.all(promises), {
            loading: `Sending ${promises.length} feedback request(s)...`,
            success: `Request(s) sent successfully!`,
            error: (err) => `Failed to send requests: ${err.message}`,
        });

        form.reset();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="targetIds"
                    render={() => (
                        <FormItem>
                            <FormLabel>Select Colleagues</FormLabel>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search for a colleague..."
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <ScrollArea className="h-48 w-full rounded-md border p-4">
                                {isLoading ? (
                                    <p className="text-muted-foreground">Loading colleagues...</p>
                                ) : (
                                    filteredEmployees.map((employee) => (
                                        <FormField
                                            key={employee.id}
                                            control={form.control}
                                            name="targetIds"
                                            render={({ field }) => {
                                                return (
                                                    <FormItem
                                                        key={employee.id}
                                                        className="flex flex-row items-start space-x-3 space-y-0 mb-4"
                                                    >
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(employee.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value || []), employee.id])
                                                                        : field.onChange(
                                                                            field.value?.filter(
                                                                                (value) => value !== employee.id
                                                                            )
                                                                        )
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                            {employee.name}
                                                        </FormLabel>
                                                    </FormItem>
                                                )
                                            }}
                                        />
                                    ))
                                )}
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Sending..." : "Send Request(s)"}
                </Button>
            </form>
        </Form>
    );
};

export default RequestFeedbackForm;
