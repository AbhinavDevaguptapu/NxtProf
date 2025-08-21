import React, { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, ArchiveRestore } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface ArchivedEmployee {
    id: string;
    name: string;
    email: string;
}

const ArchivedEmployeeSkeleton = () => (
    <Card className="flex items-center justify-between p-4">
        <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
    </Card>
);

const ArchivedEmployeesPage: React.FC = () => {
    const [archivedEmployees, setArchivedEmployees] = useState<ArchivedEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnarchiving, setIsUnarchiving] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchArchivedEmployees = useCallback(async () => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const getArchivedEmployees = httpsCallable(functions, "getArchivedEmployees");
            const result = await getArchivedEmployees();
            setArchivedEmployees(result.data as ArchivedEmployee[]);
        } catch (error) {
            console.error("Error fetching archived employees:", error);
            toast({
                title: "Error",
                description: "Could not fetch archived employees.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchArchivedEmployees();
    }, [fetchArchivedEmployees]);

    const handleUnarchive = async (employeeId: string) => {
        setIsUnarchiving(employeeId);
        try {
            const functions = getFunctions();
            const unarchiveEmployee = httpsCallable(functions, "unarchiveEmployee");
            await unarchiveEmployee({ uid: employeeId });
            toast({
                title: "Success",
                description: "Employee has been unarchived.",
            });
            fetchArchivedEmployees();
        } catch (error) {
            console.error("Error unarchiving employee:", error);
            toast({
                title: "Error",
                description: "Could not unarchive employee.",
                variant: "destructive",
            });
        } finally {
            setIsUnarchiving(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Archived Employees</CardTitle>
                    <CardDescription>
                        This is a list of all archived employees. Unarchive them to restore their access.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            <ArchivedEmployeeSkeleton />
                            <ArchivedEmployeeSkeleton />
                            <ArchivedEmployeeSkeleton />
                        </div>
                    ) : archivedEmployees.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                            <User className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">No Archived Employees</h3>
                            <p>There are currently no employees in the archive.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {archivedEmployees.map((employee) => (
                                <Card key={employee.id} className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-semibold">{employee.name}</p>
                                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                                    </div>
                                    <Button
                                        onClick={() => handleUnarchive(employee.id)}
                                        disabled={isUnarchiving === employee.id}
                                    >
                                        {isUnarchiving === employee.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                        )}
                                        Unarchive
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default ArchivedEmployeesPage;
