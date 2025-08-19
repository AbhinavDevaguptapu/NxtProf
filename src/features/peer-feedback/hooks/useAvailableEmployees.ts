import { useState, useEffect } from 'react';
import { useUserAuth } from '@/context/UserAuthContext';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { toast } from 'sonner';
import { Employee } from '../types';

export const useAvailableEmployees = () => {
    const { user } = useUserAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAvailableEmployees = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }
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

    const removeEmployee = (employeeId: string) => {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    };

    return { employees, isLoading, removeEmployee };
};
