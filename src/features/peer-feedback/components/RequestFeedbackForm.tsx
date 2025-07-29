
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
import { Textarea } from "@/components/ui/textarea";
import { useUserAuth } from "@/context/UserAuthContext";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from "sonner";

const functions = getFunctions();
const requestPeerFeedback = httpsCallable(functions, 'peerFeedback-requestPeerFeedback');

const formSchema = z.object({
    targetId: z.string().min(1, "You must select a colleague."),
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

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetId: "",
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
                    fetchedEmployees.push({ id: doc.id, ...doc.data() } as Employee);
                });
                setEmployees(fetchedEmployees);
            } catch (error) {
                console.error("Error fetching employees:", error);
                toast.error("Failed to load employee list.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEmployees();
    }, [user]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        toast.promise(requestPeerFeedback(values), {
            loading: "Sending feedback request...",
            success: "Request sent successfully!",
            error: (err) => `Failed to send request: ${err.message}`,
        });
        form.reset();
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoading ? "Loading colleagues..." : "Select a colleague to request feedback from"} />
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
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Message (Optional)</FormLabel>
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
                    {form.formState.isSubmitting ? "Sending..." : "Send Request"}
                </Button>
            </form>
        </Form>
    );
};

export default RequestFeedbackForm;
