
import React, { useState, useMemo, useEffect } from 'react';
import { useAdminLearningPoints } from '@/features/learning-hours/hooks/useAdminLearningPoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { LearningPoint } from '@/features/learning-hours/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

    useEffect(() => {
        refetch();
    }, [date, refetch]);

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
                <CardTitle>Today's Learning Points</CardTitle>
                <CardDescription>
                    Here are all the learning points submitted today. You can filter them by employee.
                </CardDescription>
                <div className="pt-4 flex gap-4">
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
