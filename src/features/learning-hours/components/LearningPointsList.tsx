import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FilePlus, Lock, Unlock, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import type { LearningPoint } from '../types';
import { LearningPointForm } from '@/features/learning-hours/components/LearningPointForm';

// --- COMPONENT PROPS ---
type LearningPointsListProps = {
    points: LearningPoint[];
    isLoading: boolean;
    onAddPoint: (data: any) => void;
    onUpdatePoint: (id: string, data: any) => void;
    onDeletePoint: (id: string) => void;
    isDayLocked: boolean;
};

// --- COMPONENT ---
export const LearningPointsList = ({ points, isLoading, onAddPoint, onUpdatePoint, onDeletePoint, isDayLocked }: LearningPointsListProps) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<LearningPoint | undefined>(undefined);

    const handleOpenFormForEdit = (point: LearningPoint) => {
        setEditingPoint(point);
        setIsFormOpen(true);
    };

    const handleOpenFormForCreate = () => {
        setEditingPoint(undefined);
        setIsFormOpen(true);
    };

    const handleFormSubmit = (data: any) => {
        if (editingPoint) {
            onUpdatePoint(editingPoint.id, data);
        } else {
            onAddPoint(data);
        }
    };

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold tracking-tight">My Learning Points</h2>
                <Button onClick={handleOpenFormForCreate} disabled={isDayLocked}>
                    <FilePlus className="mr-2 h-4 w-4" />
                    Add New Point
                </Button>
            </div>

            {isDayLocked && (
                <Alert className="mb-4 border-red-400 text-red-700">
                    <Lock className="h-4 w-4 !text-red-700" />
                    <AlertTitle>Day Locked</AlertTitle>
                    <AlertDescription>
                        The learning session for today has been ended by an admin. You can no longer add or edit points for today.
                    </AlertDescription>
                </Alert>
            )}

            <AnimatePresence>
                {points.length > 0 ? (
                    <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {points.map(point => {
                            const isEditable = point.editable && !isDayLocked;
                            return (
                                <motion.div key={point.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                                    <Card className={`flex flex-col h-full ${!isEditable ? 'bg-gray-50 border-gray-200' : ''}`}>
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg pr-2">{point.task_name}</CardTitle>
                                                <div className="flex items-center gap-2">
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
                                        <CardContent className="flex-grow space-y-4">
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">Framework: {point.framework_category}</h4>
                                                {point.subcategory && <p className="text-xs text-muted-foreground">Subcategory: {point.subcategory}</p>}
                                            </div>

                                            {point.situation && <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">Situation</h4>
                                                <p className="text-sm text-muted-foreground">{point.situation}</p>
                                            </div>}

                                            {point.behavior && <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">Behavior</h4>
                                                <p className="text-sm text-muted-foreground">{point.behavior}</p>
                                            </div>}

                                            {point.impact && <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">Impact</h4>
                                                <p className="text-sm text-muted-foreground">{point.impact}</p>
                                            </div>}

                                            {point.problem && <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">Problem</h4>
                                                <p className="text-sm text-muted-foreground">{point.problem}</p>
                                            </div>}

                                            {point.core_point_missed && <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">Core Point Missed</h4>
                                                <p className="text-sm text-muted-foreground">{point.core_point_missed}</p>
                                            </div>}

                                            {point.action_item && <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">Action Item</h4>
                                                <p className="text-sm text-muted-foreground">{point.action_item}</p>
                                            </div>}

                                            {point.task_link && <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">Task Link</h4>
                                                <a href={point.task_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">{point.task_link}</a>
                                            </div>}

                                        </CardContent>
                                        <CardFooter className="flex justify-between items-center">
                                            <p className="text-xs text-muted-foreground">To: {point.recipient}</p>
                                            {isEditable && (
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => onDeletePoint(point.id)}><Trash2 className="h-4 w-4" /></Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenFormForEdit(point)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                                                </div>
                                            )}
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    !isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8 border-2 border-dashed rounded-lg">
                            <h3 className="text-xl font-semibold">No Learning Points Yet</h3>
                            <p className="text-muted-foreground mt-2">Click "Add New Point" to get started.</p>
                        </motion.div>
                    )
                )}
            </AnimatePresence>

            <LearningPointForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                defaultValues={editingPoint}
            />
        </div>
    );
};