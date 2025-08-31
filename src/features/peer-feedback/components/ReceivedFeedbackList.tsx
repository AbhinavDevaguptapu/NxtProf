
import { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Loader2, MessageSquare } from 'lucide-react';
import { Feedback } from '../types';
import { calculateOverallRating } from '../utils/ratingUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FeedbackCard from './FeedbackCard';

interface ReceivedFeedbackListProps {
    feedback: Feedback[];
    isLoading: boolean;
}

const ReceivedFeedbackList = ({ feedback, isLoading }: ReceivedFeedbackListProps) => {
    const [selectedMonth, setSelectedMonth] = useState<string>('');

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        feedback.forEach(item => {
            months.add(format(parseISO(item.submittedAt), 'yyyy-MM'));
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [feedback]);

    const filteredFeedback = useMemo(() => {
        if (!selectedMonth) {
            return [];
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
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-4" />
                <h3 className="text-lg font-semibold">No Feedback Yet</h3>
                <p className="mt-2 text-sm">
                    It looks like you haven't received any feedback yet.
                    <br />
                    Keep up the great work, and check back later!
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Overall Rating</h3>
                    {selectedMonth && (
                        <p className="text-sm text-muted-foreground">
                            <span className="font-bold text-primary">{overallRating.averageRating.toFixed(2)}</span> average | <span className="font-bold text-primary">{overallRating.starRating} ★</span> star rating from {overallRating.totalEntries} entries.
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a month" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableMonths.map(month => (
                                <SelectItem key={month} value={month}>
                                    {format(parseISO(`${month}-01`), 'MMMM yyyy')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {!selectedMonth ? (
                <div className="text-center text-muted-foreground py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-4" />
                    <h3 className="text-lg font-semibold">Please select a month</h3>
                    <p className="mt-2 text-sm">
                        Select a month from the dropdown to view your feedback.
                    </p>
                </div>
            ) : (
                <ScrollArea className="h-[400px] w-full">
                    <div className="space-y-4">
                        {filteredFeedback.length > 0 ? (
                            filteredFeedback.map((item) => (
                                <FeedbackCard key={item.id} item={item} />
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-12">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-4" />
                                <h3 className="text-lg font-semibold">No Feedback for this month</h3>
                                <p className="mt-2 text-sm">
                                    It looks like you haven't received any feedback for this month.
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
};

export default ReceivedFeedbackList;
