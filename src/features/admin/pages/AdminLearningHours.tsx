
import { useState, useMemo } from 'react';
import { useAdminLearningPoints } from '@/features/learning-hours/hooks/useAdminLearningPoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronsUpDown, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { LearningPoint } from '@/features/learning-hours/types';
import { Badge } from '@/components/ui/badge';

const PointDetails = ({ point }: { point: LearningPoint }) => {
    const detailCard = "bg-muted/50 p-4 rounded-lg";
    const detailLabel = "font-semibold text-sm text-foreground";
    const detailText = "text-sm text-muted-foreground mt-1 whitespace-pre-wrap";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/20">
            {point.point_type === 'R1' && (
                <>
                    <div className={detailCard}>
                        <p className={detailLabel}>Problem</p>
                        <p className={detailText}>{point.problem}</p>
                    </div>
                    <div className={detailCard}>
                        <p className={detailLabel}>Core Point Missed</p>
                        <p className={detailText}>{point.core_point_missed}</p>
                    </div>
                </>
            )}
            {(point.point_type === 'R2' || point.point_type === 'R3') && (
                <>
                    <div className={detailCard}>
                        <p className={detailLabel}>Situation</p>
                        <p className={detailText}>{point.situation}</p>
                    </div>
                    <div className={detailCard}>
                        <p className={detailLabel}>Behavior</p>
                        <p className={detailText}>{point.behavior}</p>
                    </div>
                    <div className={detailCard}>
                        <p className={detailLabel}>Impact</p>
                        <p className={detailText}>{point.impact}</p>
                    </div>
                </>
            )}
            {point.point_type === 'R3' && point.action_item && (
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


const AdminLearningHours = () => {
    const { learningPoints, employees, isLoading } = useAdminLearningPoints();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
    const [openRowId, setOpenRowId] = useState<string | null>(null);

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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Loading today's learning points...</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Today's Learning Points</CardTitle>
                <CardDescription>
                    Here are all the learning points submitted today. You can filter them by employee.
                </CardDescription>
                <div className="pt-4">
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
                                <TableHead className="w-[48px]"></TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Task</TableHead>
                                <TableHead>Point Type</TableHead>
                                <TableHead>To Whom</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLearningPoints.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No learning points found for the selected filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLearningPoints.map((point) => (
                                    <Collapsible asChild key={point.id} open={openRowId === point.id} onOpenChange={() => setOpenRowId(prevId => prevId === point.id ? null : point.id)}>
                                        <>
                                            <TableRow>
                                                <TableCell>
                                                    <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <ChevronsUpDown className="h-4 w-4" />
                                                            <span className="sr-only">Toggle details</span>
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                </TableCell>
                                                <TableCell className="font-medium">{employeeMap[point.userId] || 'Unknown'}</TableCell>
                                                <TableCell>
                                                    {point.task_name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{point.point_type}</Badge>
                                                </TableCell>
                                                <TableCell>{point.recipient}</TableCell>
                                                <TableCell>{format(point.createdAt.toDate(), "PPP p")}</TableCell>
                                            </TableRow>
                                            <CollapsibleContent asChild>
                                                <tr>
                                                    <td colSpan={6}>
                                                        <PointDetails point={point} />
                                                    </td>
                                                </tr>
                                            </CollapsibleContent>
                                        </>
                                    </Collapsible>
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
