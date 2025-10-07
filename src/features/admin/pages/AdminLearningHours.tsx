
import React, { useState, useMemo, useEffect } from 'react';
import { useAdminLearningPoints } from '@/features/learning-hours/hooks/useAdminLearningPoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { LearningPoint } from '@/features/learning-hours/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { useToast } from '@/components/ui/use-toast';
import { useUserAuth } from '@/context/UserAuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

const PointDetails = ({ point }: { point: LearningPoint }) => {
    const detailCard = "bg-muted/50 p-4 rounded-lg";
    const detailLabel = "font-semibold text-sm text-foreground";
    const detailText = "text-sm text-muted-foreground mt-1 whitespace-pre-wrap";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/20">
            {point.problem && (
                <div className={detailCard}>
                    <p className={detailLabel}>Problem</p>
                    <p className={detailText}>{point.problem}</p>
                </div>
            )}
            {point.core_point_missed && (
                <div className={detailCard}>
                    <p className={detailLabel}>Core Point Missed</p>
                    <p className={detailText}>{point.core_point_missed}</p>
                </div>
            )}
            {point.situation && (
                <div className={detailCard}>
                    <p className={detailLabel}>Situation</p>
                    <p className={detailText}>{point.situation}</p>
                </div>
            )}
            {point.behavior && (
                <div className={detailCard}>
                    <p className={detailLabel}>Behavior</p>
                    <p className={detailText}>{point.behavior}</p>
                </div>
            )}
            {point.impact && (
                <div className={detailCard}>
                    <p className={detailLabel}>Impact</p>
                    <p className={detailText}>{point.impact}</p>
                </div>
            )}
            {point.action_item && (
                <div className={`${detailCard} md:col-span-2 lg:col-span-1`}>
                    <p className={detailLabel}>Action Item</p>
                    <p className={detailText}>{point.action_item}</p>
                </div>
            )}
            <div className={detailCard}>
                <p className={detailLabel}>Framework Category</p>
                <p className={detailText}>{point.framework_category}</p>
            </div>
            <div className={detailCard}>
                <p className={detailLabel}>Subcategory</p>
                <p className={detailText}>{point.subcategory}</p>
            </div>
        </div>
    );
};

const LearningPointSkeletonRow = () => (
    <TableRow>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    </TableRow>
);


const AdminLearningHours = () => {
    const [date, setDate] = useState<Date>(new Date());
    const { learningPoints, employees, isLoading, refetch } = useAdminLearningPoints(date);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
    const [openRowId, setOpenRowId] = useState<string | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDateSynced, setIsDateSynced] = useState<boolean>(false);
    const { toast } = useToast();
    const { isAdmin, isCoAdmin } = useUserAuth();
    const isAdminUser = isAdmin || isCoAdmin;

    const checkSyncStatus = async () => {
        if (!isAdminUser) return;

        try {
            const dateString = format(date, 'yyyy-MM-dd');
            const docRef = doc(db, 'learning_hours', dateString);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setIsDateSynced(data.synced === true);
            } else {
                // If no document exists, then it's not synced
                setIsDateSynced(false);
            }
        } catch (error) {
            console.error("Error checking sync status:", error);
            setIsDateSynced(false);
        }
    };

    const handleSyncByDate = async () => {
        if (!date) {
            toast({
                title: "Date Required",
                description: "Please select a date to sync.",
                variant: "destructive"
            });
            return;
        }
        setIsSyncing(true);
        try {
            const syncFunction = httpsCallable(getFunctions(), 'syncLearningHoursByDate');
            const dateString = format(date, 'yyyy-MM-dd');
            const result = await syncFunction({ date: dateString }) as any;

            const message = result.data.message;

            if (message === "This session is already synced.") {
                toast({
                    title: "Already Synced",
                    description: `Learning hours for ${format(date, "PPP")} are already synced.`
                });
            } else if (message === "No locked learning points found for this session. Marked as synced.") {
                toast({
                    title: "No Points to Sync",
                    description: `No learning points found for ${format(date, "PPP")}. Marked as synced.`
                });
            } else if (message?.includes("Synced successfully")) {
                toast({
                    title: "Sync Successful",
                    description: `Learning hours synced for ${format(date, "PPP")}.`
                });
            } else {
                toast({
                    title: "Sync Completed",
                    description: message || `Learning hours processed for ${format(date, "PPP")}.`
                });
            }
            refetch(); // Refresh the learning points data after sync
            setIsDateSynced(true); // Mark as synced after successful sync
        } catch (error) {
            console.error("Failed to sync learning hours by date:", error);
            toast({
                title: "Sync Failed",
                description: "Failed to sync learning hours. Please check the console for more details.",
                variant: "destructive"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        refetch();
    }, [date, refetch]);

    useEffect(() => {
        if (isAdminUser) {
            checkSyncStatus();
        }
    }, [date, isAdminUser]);

    const employeeMap = useMemo(() => {
        return employees.reduce((acc, emp) => {
            acc[emp.id] = emp.name;
            return acc;
        }, {} as Record<string, string>);
    }, [employees]);

    const filteredLearningPoints = useMemo(() => {
        if (selectedEmployeeId === 'all') {
            return learningPoints;
        }
        return learningPoints.filter(point => point.userId === selectedEmployeeId);
    }, [learningPoints, selectedEmployeeId]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {format(date, "PPP") === format(new Date(), "PPP") ? "Today's" : format(date, "PPPP")} Learning Points
                    {isAdminUser && isDateSynced && <span className="text-sm text-green-600 font-normal ml-2">✓ Synced</span>}
                </CardTitle>
                <CardDescription>
                    Here are all the learning points submitted on {format(date, "PPP")}.
                    {isAdminUser && ` Sync status: ${isDateSynced ? "Already synced to spreadsheet" : "Not synced yet"}.`}
                    You can filter them by employee.
                </CardDescription>
                <div className="pt-4 flex gap-4 items-end">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className="w-[280px] justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(date, "PPP")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(newDate) => {
                                    if (newDate) {
                                        // To prevent any timezone-related shifts, create a new Date object in UTC
                                        // using the year, month, and day from the selected date.
                                        const correctedDate = new Date(Date.UTC(newDate.getFullYear(), newDate.getMonth(), newDate.getDate()));
                                        setDate(correctedDate);
                                    }
                                    setIsDatePickerOpen(false);
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Filter by employee..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Employees</SelectItem>
                            {employees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {isAdminUser && (
                        <Button
                            onClick={handleSyncByDate}
                            disabled={isSyncing || isDateSynced}
                            variant={isDateSynced ? "secondary" : "default"}
                        >
                            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isDateSynced ? "Already Synced" : "Sync by Date"}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Task</TableHead>
                                <TableHead>Point Type</TableHead>
                                <TableHead>To Whom</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    <LearningPointSkeletonRow />
                                    <LearningPointSkeletonRow />
                                    <LearningPointSkeletonRow />
                                    <LearningPointSkeletonRow />
                                </>
                            ) : filteredLearningPoints.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No learning points found for the selected filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLearningPoints.map((point, index) => (
                                    <React.Fragment key={point.id}>
                                        <Collapsible asChild key={point.id} open={openRowId === point.id} onOpenChange={() => setOpenRowId(prevId => prevId === point.id ? null : point.id)}>
                                            <>
                                                <CollapsibleTrigger asChild>
                                                    <TableRow className={`data-[state=open]:bg-muted/50 hover:bg-muted/50 cursor-pointer ${index % 2 === 0 ? 'bg-muted/25' : ''}`}>
                                                        <TableCell className="font-medium">{employeeMap[point.userId] || 'Unknown'}</TableCell>
                                                        <TableCell>{point.task_name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{point.point_type}</Badge>
                                                        </TableCell>
                                                        <TableCell>{point.recipient}</TableCell>
                                                        <TableCell>{format(point.createdAt.toDate(), "PPP p")}</TableCell>
                                                    </TableRow>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent asChild>
                                                    <tr className="bg-muted/25">
                                                        <td colSpan={5}>
                                                            <PointDetails point={point} />
                                                        </td>
                                                    </tr>
                                                </CollapsibleContent>
                                            </>
                                        </Collapsible>
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default AdminLearningHours;
