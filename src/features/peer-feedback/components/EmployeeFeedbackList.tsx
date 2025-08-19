import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useUserAuth } from "@/context/UserAuthContext";
import { collection, getDocs, query, where, documentId, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { toast } from "sonner";
import { UserX, Edit } from "lucide-react";
import SubmitFeedbackModal from "./SubmitFeedbackModal";
import { Employee } from "../types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const EmployeeFeedbackList = () => {
    const { user } = useUserAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        const fetchAvailableEmployees = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const employeesQuery = query(collection(db, "employees"), where(documentId(), "!=", user.uid));
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                const feedbackGivenQuery = query(
                    collection(db, "givenPeerFeedback"),
                    where("giverId", "==", user.uid),
                    where("createdAt", ">=", startOfMonth),
                    where("createdAt", "<=", endOfMonth)
                );

                const [employeesSnapshot, feedbackGivenSnapshot] = await Promise.all([
                    getDocs(employeesQuery),
                    getDocs(feedbackGivenQuery),
                ]);

                const alreadyGivenToIds = new Set(feedbackGivenSnapshot.docs.map(doc => doc.data().targetId));

                const availableEmployees: Employee[] = [];
                employeesSnapshot.forEach((doc) => {
                    if (!alreadyGivenToIds.has(doc.id)) {
                        const data = doc.data();
                        if (data.name) {
                            availableEmployees.push({ id: doc.id, name: data.name });
                        }
                    }
                });

                setEmployees(availableEmployees);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load employee list.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAvailableEmployees();
    }, [user]);

    const handleFeedbackSubmitted = (targetId: string) => {
        setEmployees(prev => prev.filter(emp => emp.id !== targetId));
        setSelectedEmployee(null);
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-3/4 mt-2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (employees.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                <UserX className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold">All Done!</h3>
                <p>You have provided feedback to all your colleagues.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee) => (
                    <Card key={employee.id} className="flex flex-col justify-between transition-all hover:shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl">{employee.name}</CardTitle>
                        </CardHeader>
                        <CardFooter>
                            <Button variant="secondary" className="w-full" onClick={() => setSelectedEmployee(employee)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Give Feedback
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {selectedEmployee && (
                <SubmitFeedbackModal
                    isOpen={!!selectedEmployee}
                    onOpenChange={() => setSelectedEmployee(null)}
                    targetEmployee={selectedEmployee}
                    onFeedbackSubmitted={() => handleFeedbackSubmitted(selectedEmployee.id)}
                />
            )}
        </>
    );
};

export default EmployeeFeedbackList;
