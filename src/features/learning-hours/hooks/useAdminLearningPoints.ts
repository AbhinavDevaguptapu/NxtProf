import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { LearningPoint, Employee } from '../types';
import { getTodaysLearningPoints } from '../services/adminService';
import { Timestamp, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

export const useAdminLearningPoints = () => {
    const { toast } = useToast();
    const [learningPoints, setLearningPoints] = useState<LearningPoint[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPoints = async () => {
            try {
                const points = await getTodaysLearningPoints();
                const formattedPoints = points.map(p => {
                    const anyPoint = p as any;
                    if (anyPoint.createdAt && typeof anyPoint.createdAt === 'object' && anyPoint.createdAt._seconds) {
                        return {
                            ...p,
                            createdAt: new Timestamp(anyPoint.createdAt._seconds, anyPoint.createdAt._nanoseconds)
                        };
                    }
                    return p;
                });
                setLearningPoints(formattedPoints);
            } catch (error) {
                console.error("Error fetching today's learning points:", error);
                toast({ title: "Error", description: "Could not fetch today's learning points.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPoints();

        const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
            const empList: Employee[] = [];
            snapshot.forEach(doc => {
                empList.push({ id: doc.id, ...doc.data() } as Employee);
            });
            setEmployees(empList.sort((a, b) => a.name.localeCompare(b.name)));
        });

        return () => {
            unsubEmployees();
        };
    }, [toast]);

    return { learningPoints, employees, isLoading };
};
