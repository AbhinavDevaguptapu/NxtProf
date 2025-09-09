import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FilePlus, Lock, Unlock, Trash2, Pencil, Eye, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import type { LearningPoint } from '../types';
import { LearningPointForm } from './LearningPointForm';
import { LearningPointFormFields } from './LearningPointFormFields';
import { LearningPointSummaryModal } from './LearningPointSummaryModal';
import { useUserAuth } from '@/context/UserAuthContext';
import { analyzeTask } from '@/features/task-analyzer/services/geminiService';
import { TaskData, AnalysisResult } from '@/features/task-analyzer/types';

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
    if ((data.point_type === 'R1' || data.point_type === 'R2') && (!data.action_item || data.action_item.length < 10)) {
        return false;
    }
    return true;
}, {
    message: "Action item must be at least 10 characters for R1 and R2.",
    path: ["action_item"],
});

// --- COMPONENT PROPS ---
type LearningPointsListProps = {
    points: LearningPoint[];
    isLoading: boolean;
    onAddPoint: (data: any) => void;
    onUpdatePoint: (id: string, data: any) => void;
    onDeletePoint: (id: string) => void;
    isDayLocked: boolean;
};

// --- INLINE FORM COMPONENT ---
const InlineLearningPointForm = ({ onFormSubmit, onCancel, points }: { onFormSubmit: (data: any) => void, onCancel: () => void, points: LearningPoint[] }) => {
    const { isAdmin } = useUserAuth();
    const [analysisScore, setAnalysisScore] = useState<number | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [analysisRationale, setAnalysisRationale] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fullAnalysisResult, setFullAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

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
            if (form.getValues('recipient') === 'Self') {
                form.setValue('recipient', '');
            }
        }
    }, [pointType, form]);

    const handleAnalysis = async () => {
        // Validate required fields before analysis
        const currentPoint = form.getValues();
        const errors = {};

        if (!currentPoint.task_name || currentPoint.task_name.trim().length < 5) {
            form.setError('task_name', { message: 'Task name is required (minimum 5 characters)' });
            return;
        }

        if (!currentPoint.framework_category) {
            form.setError('framework_category', { message: 'Task Framework Category is required' });
            return;
        }

        if (!currentPoint.point_type) {
            form.setError('point_type', { message: 'Point Type is required' });
            return;
        }

        if (!currentPoint.situation || currentPoint.situation.trim().length < 10) {
            form.setError('situation', { message: 'Situation is required (minimum 10 characters)' });
            return;
        }

        if (!currentPoint.behavior || currentPoint.behavior.trim().length < 10) {
            form.setError('behavior', { message: 'Behavior is required (minimum 10 characters)' });
            return;
        }

        if (!currentPoint.impact || currentPoint.impact.trim().length < 10) {
            form.setError('impact', { message: 'Impact is required (minimum 10 characters)' });
            return;
        }

        if (!currentPoint.recipient || currentPoint.recipient.trim().length < 3) {
            form.setError('recipient', { message: 'Recipient is required (minimum 3 characters)' });
            return;
        }

        // Check action_item for R1 and R2 points
        if ((currentPoint.point_type === 'R1' || currentPoint.point_type === 'R2') &&
            (!currentPoint.action_item || currentPoint.action_item.trim().length < 10)) {
            form.setError('action_item', { message: 'Action Item is required for R1 and R2 points (minimum 10 characters)' });
            return;
        }

        // If validation passes, clear any existing errors
        const fieldNames: (keyof typeof currentPoint)[] = ['task_name', 'framework_category', 'point_type', 'subcategory', 'task_link', 'recipient', 'situation', 'behavior', 'impact', 'action_item'];
        fieldNames.forEach(field => {
            form.clearErrors(field);
        });

        setIsAnalyzing(true);
        setAnalysisComplete(false);
        setAnalysisRationale(null);
        let totalScore = 0;
        let lastRationale = '';

        const allPoints = [...points, {
            id: 'new-point',
            createdAt: new Timestamp(Date.now() / 1000, 0),
            task_name: currentPoint.task_name,
            framework_category: currentPoint.framework_category,
            situation: currentPoint.situation,
            behavior: currentPoint.behavior,
            impact: currentPoint.impact,
            action_item: currentPoint.action_item,
            point_type: currentPoint.point_type,
            editable: true,
            recipient: currentPoint.recipient,
        }];

        if (allPoints.length === 0) {
            setIsAnalyzing(false);
            return;
        }

        for (const point of allPoints) {
            const taskData: TaskData = {
                id: point.id,
                date: point.createdAt ? format(point.createdAt.toDate(), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
                task: point.task_name,
                taskFrameworkCategory: point.framework_category,
                situation: point.situation,
                behavior: point.behavior,
                impact: point.impact,
                action: point.action_item || '',
                pointType: point.point_type,
            };
            const result = await analyzeTask(taskData);
            totalScore += result.matchPercentage;
            lastRationale = result.rationale;
            setFullAnalysisResult(result);
        }

        const averageScore = totalScore / allPoints.length;
        setAnalysisScore(averageScore);
        setAnalysisRationale(lastRationale);
        setIsAnalyzing(false);
        setAnalysisComplete(true);
        setIsModalOpen(true);
    };

    const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
        const submissionData = {
            ...data,
            date: Timestamp.fromDate(data.date),
        };
        onFormSubmit(submissionData);
        form.reset();
    };

    const isR3Point = form.watch('point_type') === 'R3';
    const isSubmitDisabled = isAdmin || (!isR3Point && (!analysisComplete || (analysisScore !== null && analysisScore < 80)));

    // Check if all required fields are filled for analysis
    const currentPoint = form.watch();
    const isFormValidForAnalysis =
        currentPoint.task_name && currentPoint.task_name.trim().length >= 5 &&
        currentPoint.framework_category &&
        currentPoint.point_type &&
        currentPoint.situation && currentPoint.situation.trim().length >= 10 &&
        currentPoint.behavior && currentPoint.behavior.trim().length >= 10 &&
        currentPoint.impact && currentPoint.impact.trim().length >= 10 &&
        currentPoint.recipient && currentPoint.recipient.trim().length >= 3 &&
        ((currentPoint.point_type !== 'R1' && currentPoint.point_type !== 'R2') ||
         (currentPoint.action_item && currentPoint.action_item.trim().length >= 10));

    const analysisDisabled = isAnalyzing || isR3Point || !isFormValidForAnalysis;

    useEffect(() => {
        const subscription = form.watch(() => {
            setAnalysisComplete(false);
            setAnalysisScore(null);
            setAnalysisRationale(null);
            setFullAnalysisResult(null);
        });

        const handleApplySuggestions = () => {
            if (!fullAnalysisResult) return;

            // Update form fields with corrected values
            if (fullAnalysisResult.correctedSituation) {
                form.setValue('situation', fullAnalysisResult.correctedSituation);
            }
            if (fullAnalysisResult.correctedBehavior) {
                form.setValue('behavior', fullAnalysisResult.correctedBehavior);
            }
            if (fullAnalysisResult.correctedImpact) {
                form.setValue('impact', fullAnalysisResult.correctedImpact);
            }
            if (fullAnalysisResult.correctedActionItem) {
                form.setValue('action_item', fullAnalysisResult.correctedActionItem);
            }

            // Clear the analysis state and close modal
            setIsConfirmDialogOpen(false);
            setIsModalOpen(false);
            setAnalysisComplete(false);
            setAnalysisScore(null);
            setAnalysisRationale(null);
            setFullAnalysisResult(null);
        };

        return () => subscription.unsubscribe();
    }, [form, fullAnalysisResult]);

    // Calculate hasCorrections outside useEffect
    const hasCorrections = fullAnalysisResult && (
        fullAnalysisResult.correctedSituation ||
        fullAnalysisResult.correctedBehavior ||
        fullAnalysisResult.correctedImpact ||
        fullAnalysisResult.correctedActionItem
    );

    const handleApplySuggestions = () => {
        if (!fullAnalysisResult) return;

        // Update form fields with corrected values
        if (fullAnalysisResult.correctedSituation) {
            form.setValue('situation', fullAnalysisResult.correctedSituation);
        }
        if (fullAnalysisResult.correctedBehavior) {
            form.setValue('behavior', fullAnalysisResult.correctedBehavior);
        }
        if (fullAnalysisResult.correctedImpact) {
            form.setValue('impact', fullAnalysisResult.correctedImpact);
        }
        if (fullAnalysisResult.correctedActionItem) {
            form.setValue('action_item', fullAnalysisResult.correctedActionItem);
        }

        // Clear the analysis state and close modal
        setIsConfirmDialogOpen(false);
        setIsModalOpen(false);
        setAnalysisComplete(false);
        setAnalysisScore(null);
        setAnalysisRationale(null);
        setFullAnalysisResult(null);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-6 border rounded-lg bg-background">
                <LearningPointFormFields />
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
                    {!isR3Point && (
                        <Button type="button" onClick={handleAnalysis} disabled={analysisDisabled} className="w-full sm:w-auto">
                            {isAnalyzing ? 'Analyzing...' : 'Get Analysis and Confirmation'}
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitDisabled} className="w-full sm:w-auto">Submit</Button>
                    <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
                </div>
            </form>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Analysis Result</DialogTitle>
                        <DialogDescription>
                            Here are your analysis Results:
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4">
                        {analysisScore !== null && (
                            <div className="text-lg font-semibold">
                                Score: <span className={analysisScore >= 80 ? 'text-green-600' : 'text-red-600'}>{analysisScore.toFixed(2)}%</span>
                            </div>
                        )}
                        {analysisRationale && (
                            <p className="text-sm text-muted-foreground">{analysisRationale}</p>
                        )}

                        {/* Display corrections if available */}
                        {fullAnalysisResult && fullAnalysisResult.status === "Needs improvement" && (
                            (fullAnalysisResult.correctedSituation ||
                             fullAnalysisResult.correctedBehavior ||
                             fullAnalysisResult.correctedImpact ||
                             fullAnalysisResult.correctedActionItem) && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-semibold text-blue-800 mb-3">Suggested Improvements:</h4>
                                    <div className="space-y-2 text-sm">
                                        {fullAnalysisResult.correctedSituation && (
                                            <div>
                                                <strong className="text-blue-700">Situation:</strong>
                                                <p className="text-gray-700 mt-1">{fullAnalysisResult.correctedSituation}</p>
                                            </div>
                                        )}
                                        {fullAnalysisResult.correctedBehavior && (
                                            <div>
                                                <strong className="text-blue-700">Behavior:</strong>
                                                <p className="text-gray-700 mt-1">{fullAnalysisResult.correctedBehavior}</p>
                                            </div>
                                        )}
                                        {fullAnalysisResult.correctedImpact && (
                                            <div>
                                                <strong className="text-blue-700">Impact:</strong>
                                                <p className="text-gray-700 mt-1">{fullAnalysisResult.correctedImpact}</p>
                                            </div>
                                        )}
                                        {fullAnalysisResult.correctedActionItem && (
                                            <div>
                                                <strong className="text-blue-700">Action Item:</strong>
                                                <p className="text-gray-700 mt-1">{fullAnalysisResult.correctedActionItem}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        )}

                        {/* Replace Suggestions Button */}
                        {fullAnalysisResult && fullAnalysisResult.status === "Needs improvement" && hasCorrections && (
                            <div className="mt-4 flex justify-center">
                                <Button
                                    onClick={() => setIsConfirmDialogOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                                >
                                    <span className="hidden sm:inline">Replace Suggestions</span>
                                    <span className="sm:hidden">Replace</span>
                                </Button>
                            </div>
                        )}

                        {analysisScore < 80 && (
                            <p className="text-sm text-red-600">Your score is below 80%. Please improve your points and re-run the analysis.</p>
                        )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <AlertDialogContent className="sm:max-w-[450px] w-[95vw]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Replace with AI Suggestions?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Do you want to really replace? AI suggestions are sometimes inaccurate.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>
                            No, Keep My Data
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleApplySuggestions}>
                            Yes, Replace with AI Suggestions
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </FormProvider>
    );
};


// --- MAIN COMPONENT ---
export const LearningPointsList = ({ points, isLoading, onAddPoint, onUpdatePoint, onDeletePoint, isDayLocked }: LearningPointsListProps) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditingFormOpen, setIsEditingFormOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<LearningPoint | undefined>(undefined);
    const [viewingPoint, setViewingPoint] = useState<LearningPoint | null>(null);

    const handleOpenFormForEdit = (point: LearningPoint) => {
        setEditingPoint(point);
        setIsEditingFormOpen(true);
    };

    const handleAddFormSubmit = (data: any) => {
        onAddPoint(data);
        setIsFormOpen(false);
    };

    const handleEditFormSubmit = (data: any) => {
        if (editingPoint) {
            onUpdatePoint(editingPoint.id, data);
        }
        setIsEditingFormOpen(false);
    };

    return (
        <>
            <div className="mt-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">My Learning Points</h2>
                        {!isFormOpen && (
                            <a
                                href="https://d2rj3iig8nko29.cloudfront.net/website-static/task-framework.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1.5 mt-1"
                            >
                                <BookOpen className="h-4 w-4" />
                                View Task Framework Guide
                            </a>
                        )}
                    </div>
                    {!isFormOpen && (
                        <Button onClick={() => setIsFormOpen(true)} disabled={isDayLocked}>
                            <FilePlus className="mr-2 h-4 w-4" />
                            Add New Point
                        </Button>
                    )}
                </div>

                <AnimatePresence>
                    {isFormOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mb-6"
                        >
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                                <p className="text-sm text-muted-foreground text-center sm:text-left">Please refer the Guide before writing points.</p>
                                <a
                                    href="https://d2rj3iig8nko29.cloudfront.net/website-static/task-framework.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 p-2 rounded-md bg-primary/10"
                                >
                                    <BookOpen className="h-4 w-4" />
                                    View Task Framework Guide
                                </a>
                            </div>
                            <InlineLearningPointForm
                                onFormSubmit={handleAddFormSubmit}
                                onCancel={() => setIsFormOpen(false)}
                                points={points}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {isDayLocked && (
                    <Alert className="mb-4 border-red-400 text-red-700">
                        <Lock className="h-4 w-4 !text-red-700" />
                        <AlertTitle>Day Locked</AlertTitle>
                        <AlertDescription>
                            The learning session for today has been ended by an admin. You can no longer add or edit points for today.
                        </AlertDescription>
                    </Alert>
                )}

                <AnimatePresence mode="wait">
                    {points.length > 0 ? (
                        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" key="points-grid">
                            {points.map(point => {
                                const isEditable = point.editable && !isDayLocked;
                                return (
                                    <motion.div key={point.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                                        <Card key={`card-${point.id}-${point.createdAt?.toString()}`} className={`flex flex-col h-full ${!isEditable ? 'bg-gray-50/30 border-gray-200' : 'bg-background border-border'}`}>
                                            <CardHeader>
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-lg truncate pr-2">{point.task_name}</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <Badge variant={isEditable ? 'outline' : 'secondary'}>
                                                            {isEditable ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                                                            {isEditable ? 'Editable' : 'Locked'}
                                                        </Badge>
                                                        <Badge variant="default">{point.point_type}</Badge>
                                                    </div>
                                                </div>
                                                <CardDescription>
                                                    {point.createdAt ? format(point.createdAt.toDate(), 'PPP p') : 'Date not available'}
                                                </CardDescription>
                                            </CardHeader>
                                            
                                            <CardFooter className="flex flex-col gap-3 mt-auto pt-4">
                                                <p className="text-xs text-muted-foreground w-full">To: {point.recipient}</p>
                                                <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-end sm:gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setViewingPoint(point)} className="w-full sm:w-auto sm:mr-0">
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        <span className="hidden sm:inline">View Summary</span>
                                                        <span className="sm:hidden">View</span>
                                                    </Button>
                                                    {isEditable && (
                                                        <>
                                                            <Button variant="outline" size="sm" onClick={() => handleOpenFormForEdit(point)} className="w-full sm:w-auto sm:flex-1 sm:flex-none">
                                                                <Pencil className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => onDeletePoint(point.id)} className="w-full sm:w-auto sm:flex-none">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    ) : (
                        !isLoading && !isFormOpen && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8 border-2 border-dashed rounded-lg">
                                <h3 className="text-xl font-semibold">No Learning Points Yet</h3>
                                <p className="text-muted-foreground mt-2">Click "Add New Point" to get started.</p>
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </div>

            <LearningPointForm
                isOpen={isEditingFormOpen}
                onClose={() => setIsEditingFormOpen(false)}
                onSubmit={handleEditFormSubmit}
                defaultValues={editingPoint}
            />

            <LearningPointSummaryModal
                isOpen={!!viewingPoint}
                onClose={() => setViewingPoint(null)}
                point={viewingPoint}
            />
        </>
    );
};