import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore';

// UI Components
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

// Feature Components
import { LearningPointFormFields } from './LearningPointFormFields';

// Types
import type { LearningPoint } from '../types';

// --- FORM SCHEMA ---
const formSchema = z.object({
    date: z.date().optional(),
    task_name: z.string().min(5, { message: 'Task name must be at least 5 characters.' }),
    framework_category: z.string().min(1, { message: "Please select a category." }),
    point_type: z.enum(['R1', 'R2', 'R3']).optional(),
    subcategory: z.string().optional(),
    task_link: z.string().optional(),
    recipient: z.string().min(3, { message: 'Recipient is required.' }),
    situation: z.string().min(10, { message: 'Situation must be at least 10 characters.' }),
    behavior: z.string().min(10, { message: 'Behavior must be at least 10 characters.' }),
    impact: z.string().min(10, { message: 'Impact must be at least 10 characters.' }),
    action_item: z.string().optional(),
}).refine(data => data.date, {
    message: "A date is required.",
    path: ["date"],
}).refine(data => data.point_type, {
    message: "You must select a point type.",
    path: ["point_type"],
}).refine(data => {
    if (data.point_type === 'R1' && (!data.action_item || data.action_item.length < 10)) {
        return false;
    }
    return true;
}, {
    message: "Action item must be at least 10 characters for R1.",
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
import { useUserAuth } from '@/context/UserAuthContext';

export const LearningPointForm = ({ isOpen, onClose, onSubmit, defaultValues }: LearningPointFormProps) => {
    const { isAdmin } = useUserAuth();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            task_name: '',
            framework_category: '',
            point_type: undefined,
            subcategory: '',
            task_link: '',
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
            form.setValue('recipient', 'Self');
        } else {
            // If the user changes from R1 to something else, clear the recipient field
            if (form.getValues('recipient') === 'Self') {
                form.setValue('recipient', '');
            } else if (defaultValues?.recipient !== 'Self') {
                form.setValue('recipient', defaultValues?.recipient || '');
            }
        }

        // Clear action_item for R2 and R3
        if (pointType === 'R2' || pointType === 'R3') {
            form.setValue('action_item', '');
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
                task_link: defaultValues?.task_link || '',
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
            <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-md md:max-w-3xl h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{defaultValues?.id ? 'Edit' : 'Create'} Learning Point</DialogTitle>
                    <DialogDescription>
                        Fill out the details for the learning point. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                        <LearningPointFormFields />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={isAdmin}>Save Point</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
};
