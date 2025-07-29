
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw, Star } from 'lucide-react';
import { Feedback } from '../hooks/useReceivedFeedback';

interface ReceivedFeedbackListProps {
    feedback: Feedback[];
    isLoading: boolean;
    refresh: () => void;
}

const ReceivedFeedbackList = ({ feedback, isLoading, refresh }: ReceivedFeedbackListProps) => {
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
                <Button variant="outline" size="sm" className="mt-4" onClick={refresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check for new feedback
                </Button>
            </div>
        );
    }

    const totalRatings = feedback.reduce((acc, item) => acc + item.workEfficiency + item.easeOfWork, 0);
    const averageRating = totalRatings / (feedback.length * 2);

    let finalRating: number;
    if (averageRating >= 4.8) {
        finalRating = 5;
    } else if (averageRating >= 4.6) {
        finalRating = 4;
    } else if (averageRating >= 4.3) {
        finalRating = 3;
    } else if (averageRating >= 4.0) {
        finalRating = 2;
    } else if (averageRating >= 3.5) {
        finalRating = 1;
    } else {
        finalRating = 0;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Overall Rating</h3>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-primary">{averageRating.toFixed(2)}</span> average | <span className="font-bold text-primary">{finalRating} ★</span> final rating from {feedback.length} entries.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            <ScrollArea className="h-[400px] w-full">
                <div className="space-y-4">
                    {feedback.map((item) => {
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
