
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Loader2, RefreshCw } from 'lucide-react';
import { Feedback } from '../types';
import { OverallRating, calculateOverallRating } from '../utils/ratingUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReceivedFeedbackListProps {
    feedback: Feedback[];
    isLoading: boolean;
}

const ReceivedFeedbackList = ({ feedback, isLoading }: ReceivedFeedbackListProps) => {
    const [selectedMonth, setSelectedMonth] = useState<string>('all');

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        feedback.forEach(item => {
            months.add(format(parseISO(item.submittedAt), 'yyyy-MM'));
        });
        return Array.from(months).sort().reverse();
    }, [feedback]);

    const filteredFeedback = useMemo(() => {
        if (selectedMonth === 'all') {
            return feedback;
        }
        return feedback.filter(item => format(parseISO(item.submittedAt), 'yyyy-MM') === selectedMonth);
    }, [feedback, selectedMonth]);

    const overallRating = useMemo(() => calculateOverallRating(filteredFeedback), [filteredFeedback]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading your feedback...</p>
            </div>
        );
    }

    if (feedback.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12">
                <p>You have not received any feedback yet.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Overall Rating</h3>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-primary">{overallRating.averageRating.toFixed(2)}</span> average | <span className="font-bold text-primary">{overallRating.finalRating} ★</span> final rating from {overallRating.totalEntries} entries.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {availableMonths.map(month => (
                                <SelectItem key={month} value={month}>
                                    {format(parseISO(`${month}-01`), 'MMMM yyyy')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <ScrollArea className="h-[400px] w-full">
                <div className="space-y-4">
                    {filteredFeedback.map((item) => {
                        return (
                            <Card key={item.id}>
                                <CardHeader className="pb-2 flex-row justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base">{item.projectOrTask}</CardTitle>
                                        <CardDescription>
                                            Received {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground mb-2">
                                        <span>Work Efficiency: <strong>{item.workEfficiency}/5</strong></span>
                                        <span className="mx-2">|</span>
                                        <span>Ease of Work: <strong>{item.easeOfWork}/5</strong></span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{item.remarks}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};

export default ReceivedFeedbackList;
