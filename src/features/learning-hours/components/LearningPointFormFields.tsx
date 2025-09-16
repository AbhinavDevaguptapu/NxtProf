import { useFormContext } from 'react-hook-form'

// UI Components
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export const LearningPointFormFields = () => {
    const form = useFormContext();
    const pointType = form.watch('point_type');

    return (
        <div className="space-y-6">
            {/* The date field is hidden but its value is still managed by the form state */}
            <FormField control={form.control} name="date" render={() => <FormItem className="hidden"><FormControl><Input type="hidden" /></FormControl></FormItem>} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="task_name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Task in the Day (As in Day Plan)</FormLabel>
                        <FormControl><Input placeholder="e.g., Refactor the authentication module" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

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
                                <SelectItem value="Commitment">Commitment</SelectItem>
                                <SelectItem value="ELP">ELP</SelectItem>
                                <SelectItem value="Objective">Objective</SelectItem>
                                <SelectItem value="Timeframe">Timeframe</SelectItem>
                                <SelectItem value="Quality">Quality</SelectItem>
                                <SelectItem value="Efficiency and Creativity">Efficiency and Creativity</SelectItem>
                                <SelectItem value="Task Review">Task Review</SelectItem>
                                <SelectItem value="Growth Mindset">Growth Mindset</SelectItem>
                                <SelectItem value="Outcome vs Output">Outcome vs Output</SelectItem>
                                <SelectItem value="Being Organized">Being Organized</SelectItem>
                                <SelectItem value="OTHERS">OTHERS</SelectItem>
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

                <FormField control={form.control} name="task_link" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Task Link (optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., https://github.com/pull/123" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="point_type" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Point Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a point type" /></SelectTrigger></FormControl>
                            <SelectContent position="popper">
                                <SelectItem value="R1">R1</SelectItem>
                                <SelectItem value="R2">R2</SelectItem>
                                <SelectItem value="R3">R3</SelectItem>
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

                {pointType === 'R1' && (
                    <FormField control={form.control} name="action_item" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Action Item (A)</FormLabel>
                            <FormControl><Textarea placeholder="Describe the action item..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}
            </div>
        </div>
    );
};