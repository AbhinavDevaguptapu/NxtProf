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
                        {points.map(point => (
                            <motion.div key={point.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                                <Card className={`flex flex-col h-full ${!point.editable ? 'bg-gray-50 border-gray-200' : ''}`}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg pr-2">{point.task_name}</CardTitle>
                                            <Badge variant={point.editable ? 'outline' : 'secondary'}>
                                                {point.editable ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                                                {point.editable ? 'Editable' : 'Locked'}
                                            </Badge>
                                        </div>
                                        <CardDescription>
                                            {point.createdAt ? format(point.createdAt.toDate(), 'PPP p') : 'Date not available'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground line-clamp-3">{point.situation}</p>
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2">
                                        {point.editable && (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => onDeletePoint(point.id)}><Trash2 className="h-4 w-4" /></Button>
                                                <Button variant="outline" size="sm" onClick={() => handleOpenFormForEdit(point)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                                            </>
                                        )}
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
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