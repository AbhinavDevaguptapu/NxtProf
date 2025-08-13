import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { LearningPoint, Employee } from '../types';
import { getLearningPointsByDate } from '../services/adminService';
import { Timestamp, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

export const useAdminLearningPoints = (date?: Date) => {
    const { toast } = useToast();
    const [learningPoints, setLearningPoints] = useState<LearningPoint[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPoints = useCallback(async () => {
        setIsLoading(true);
        try {
            const points = await getLearningPointsByDate(date);
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
            console.error("Error fetching learning points:", error);
            toast({ title: "Error", description: "Could not fetch learning points for the selected date.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [date, toast]);

    useEffect(() => {
        fetchPoints();
    }, [fetchPoints]);

    useEffect(() => {
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
    }, []);

    return { learningPoints, employees, isLoading, refetch: fetchPoints };
};
