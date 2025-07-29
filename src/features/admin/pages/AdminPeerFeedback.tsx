
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Loader2, MessageSquare, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GivenFeedback {
    id: string;
    giverId: string;
    targetId: string;
    projectOrTask: string;
    workEfficiency: number;
    easeOfWork: number;
    remarks: string;
    createdAt: {
        toDate: () => Date;
    };
    type: 'direct' | 'requested';
}

interface Employee {
    id: string;
    name: string;
}

const AdminPeerFeedback = () => {
    const [allFeedback, setAllFeedback] = useState<GivenFeedback[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');

    useEffect(() => {
        // Listener for employee names
        const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
            const empList: Employee[] = [];
            snapshot.forEach(doc => {
                empList.push({ id: doc.id, name: doc.data().name || 'Unknown' });
            });
            setEmployees(empList.sort((a, b) => a.name.localeCompare(b.name)));
        });

        // Listener for feedback
        const q = query(collection(db, "givenPeerFeedback"), orderBy("createdAt", "desc"));
        const unsubFeedback = onSnapshot(q, (snapshot) => {
            const fetchedFeedback: GivenFeedback[] = [];
            snapshot.forEach((doc) => {
                fetchedFeedback.push({ id: doc.id, ...doc.data() } as GivenFeedback);
            });
            setAllFeedback(fetchedFeedback);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching peer feedback:", error);
            toast.error("Failed to load peer feedback.");
            setIsLoading(false);
        });

        return () => {
            unsubEmployees();
            unsubFeedback();
        };
    }, []);

    const filteredFeedback = useMemo(() => {
        if (selectedEmployeeId === 'all') {
            return allFeedback;
        }
        return allFeedback.filter(
            (item) => item.giverId === selectedEmployeeId || item.targetId === selectedEmployeeId
        );
    }, [allFeedback, selectedEmployeeId]);

    const employeeMap = useMemo(() => {
        return employees.reduce((acc, emp) => {
            acc[emp.id] = emp.name;
            return acc;
        }, {} as Record<string, string>);
    }, [employees]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading all feedback...</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>All Peer Feedback (Real-time)</CardTitle>
                <CardDescription>Filter the feedback records by selecting an employee.</CardDescription>
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
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Giver</TableHead>
                                    <TableHead>Receiver</TableHead>
                                    <TableHead className="hidden md:table-cell">Type</TableHead>
                                    <TableHead>Feedback</TableHead>
                                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFeedback.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No feedback found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredFeedback.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{employeeMap[item.giverId] || item.giverId}</div>
                                                <div className="text-sm text-muted-foreground md:hidden">
                                                    to {employeeMap[item.targetId] || item.targetId}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{employeeMap[item.targetId] || item.targetId}</TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant={item.type === 'requested' ? "secondary" : "outline"}>
                                                    {item.type === 'requested' ? <MessageSquare className="h-3 w-3 mr-1.5" /> : <Edit className="h-3 w-3 mr-1.5" />}
                                                    {item.type === 'requested' ? 'Requested' : 'Direct'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-pre-wrap max-w-xs">
                                                <strong>Project | Task :</strong> {item.projectOrTask}<br />
                                                <strong>Efficiency:</strong> {item.workEfficiency}/5 | <strong>Ease of Work:</strong> {item.easeOfWork}/5<br /><br />
                                                {item.remarks}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">{format(item.createdAt.toDate(), "PPP")}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default AdminPeerFeedback;
