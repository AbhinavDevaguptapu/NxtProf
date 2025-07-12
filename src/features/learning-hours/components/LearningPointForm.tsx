import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CalendarIcon } from 'lucide-react';

// Types
import type { LearningPoint } from '../types';

// --- FORM SCHEMA ---
const formSchema = z.object({
    date: z.date({ required_error: "A date is required." }),
    task_name: z.string().min(5, { message: 'Task name must be at least 5 characters.' }),
    framework_category: z.string().min(1, { message: "Please select a category." }),
    point_type: z.enum(['R1', 'R2', 'R3'], { required_error: "You must select a point type." }),
    subcategory: z.string().min(3, { message: 'Subcategory is required.' }),
    recipient: z.string().min(3, { message: 'Recipient is required.' }),
    situation: z.string().min(10, { message: 'Situation must be at least 10 characters.' }),
    behavior: z.string().min(10, { message: 'Behavior must be at least 10 characters.' }),
    impact: z.string().min(10, { message: 'Impact must be at least 10 characters.' }),
    action_item: z.string().optional(),
}).refine(data => {
    if ((data.point_type === 'R1' || data.point_type === 'R2') && (!data.action_item || data.action_item.length < 10)) {
        return false;
    }
    return true;
}, {
    message: "Action item must be at least 10 characters for R1 and R2.",
    path: ["action_item"],
});


// --- COMPONENT PROPS ---
type LearningPointFormProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<z.infer<typeof formSchema>, 'date'> & { date: Timestamp; }) => void;
    defaultValues?: Partial<LearningPoint>;
};

// --- COMPONENT ---
export const LearningPointForm = ({ isOpen, onClose, onSubmit, defaultValues }: LearningPointFormProps) => {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            task_name: '',
            framework_category: '',
            point_type: undefined,
            subcategory: '',
            recipient: '',
            situation: '',
            behavior: '',
            impact: '',
            action_item: '',
        },
    });

    const pointType = form.watch('point_type');

    useEffect(() => {
        if (pointType === 'R1') {
            form.setValue('recipient', 'self');
        } else if (defaultValues?.recipient !== 'self') {
            form.setValue('recipient', defaultValues?.recipient || '');
        }
    }, [pointType, form, defaultValues]);

    useEffect(() => {
        if (isOpen) {
            form.reset({
                date: new Date(), // Always reset to today's date
                task_name: defaultValues?.task_name || '',
                framework_category: defaultValues?.framework_category || '',
                point_type: defaultValues?.point_type || undefined,
                subcategory: defaultValues?.subcategory || '',
                recipient: defaultValues?.recipient || '',
                situation: defaultValues?.situation || '',
                behavior: defaultValues?.behavior || '',
                impact: defaultValues?.impact || '',
                action_item: defaultValues?.action_item || '',
            });
        }
    }, [isOpen, defaultValues, form]);

    const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
        const submissionData = {
            ...data,
            date: Timestamp.fromDate(data.date),
        };
        onSubmit(submissionData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md md:max-w-3xl h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{defaultValues?.id ? 'Edit' : 'Create'} Learning Point</DialogTitle>
                    <DialogDescription>
                        Fill out the details for the learning point. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button disabled variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="task_name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Task in the Day (As in Day Plan)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Refactor the authentication module" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="framework_category" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Task Framework Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a framework category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent position="popper">
                                            <SelectItem value="Commitment" className="hover:bg-accent hover:text-accent-foreground">Commitment</SelectItem>
                                            <SelectItem value="ELP" className="hover:bg-accent hover:text-accent-foreground">ELP</SelectItem>
                                            <SelectItem value="Objective" className="hover:bg-accent hover:text-accent-foreground">Objective</SelectItem>
                                            <SelectItem value="Timeframe" className="hover:bg-accent hover:text-accent-foreground">Timeframe</SelectItem>
                                            <SelectItem value="Quality" className="hover:bg-accent hover:text-accent-foreground">Quality</SelectItem>
                                            <SelectItem value="Efficiency and Creativity" className="hover:bg-accent hover:text-accent-foreground">Efficiency and Creativity</SelectItem>
                                            <SelectItem value="Task Review" className="hover:bg-accent hover:text-accent-foreground">Task Review</SelectItem>
                                            <SelectItem value="Growth Mindset" className="hover:bg-accent hover:text-accent-foreground">Growth Mindset</SelectItem>
                                            <SelectItem value="Outcome vs Output" className="hover:bg-accent hover:text-accent-foreground">Outcome vs Output</SelectItem>
                                            <SelectItem value="Being Organized" className="hover:bg-accent hover:text-accent-foreground">Being Organized</SelectItem>
                                            <SelectItem value="OTHERS" className="hover:bg-accent hover:text-accent-foreground">OTHERS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="subcategory" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sub-Category (if applicable)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Frontend, Backend, DevOps" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="point_type" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Point Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a point type" /></SelectTrigger></FormControl>
                                        <SelectContent position="popper">
                                            <SelectItem value="R1" className="hover:bg-accent hover:text-accent-foreground">R1</SelectItem>
                                            <SelectItem value="R2" className="hover:bg-accent hover:text-accent-foreground">R2</SelectItem>
                                            <SelectItem value="R3" className="hover:bg-accent hover:text-accent-foreground">R3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="recipient" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>To Whom</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Team, Client, Self" {...field} disabled={pointType === 'R1'} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <div className="space-y-6">
                            <FormField control={form.control} name="situation" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Situation (S)</FormLabel>
                                    <FormControl><Textarea placeholder="Describe the situation..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="behavior" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Behavior (B)</FormLabel>
                                    <FormControl><Textarea placeholder="Describe the behavior..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="impact" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Impact (I)</FormLabel>
                                    <FormControl><Textarea placeholder="Describe the impact..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {pointType !== 'R3' && (
                                <FormField control={form.control} name="action_item" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Action Item (A)</FormLabel>
                                        <FormControl><Textarea placeholder="Describe the action item..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            <Button type="submit">Save Point</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
