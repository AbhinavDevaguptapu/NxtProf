
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import SubmitFeedbackModal from './SubmitFeedbackModal';
import { FeedbackRequest } from '../hooks/usePendingRequests';
import { Loader2 } from 'lucide-react';

interface PendingRequestsListProps {
    requests: FeedbackRequest[];
    isLoading: boolean;
    onFeedbackSubmitted: () => void;
}

const PendingRequestsList = ({ requests, isLoading, onFeedbackSubmitted }: PendingRequestsListProps) => {
    const [selectedRequest, setSelectedRequest] = useState<FeedbackRequest | null>(null);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading requests...</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12">
                <p>You have no pending feedback requests.</p>
            </div>
        );
    }

    return (
        <>
            <ScrollArea className="h-[400px] w-full">
                <div className="space-y-4">
                    {requests.map((request) => (
                        <Card key={request.id}>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Request from {request.requesterName}
                                </CardTitle>
                                <CardDescription>
                                    Requested {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm p-3 bg-muted rounded-lg">{request.message}</p>
                                <Button onClick={() => setSelectedRequest(request)}>Give Feedback</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
            {selectedRequest && (
                <SubmitFeedbackModal
                    request={selectedRequest}
                    onOpenChange={() => setSelectedRequest(null)}
                    onFeedbackSubmitted={() => {
                        setSelectedRequest(null);
                        onFeedbackSubmitted();
                    }}
                />
            )}
        </>
    );
};

export default PendingRequestsList;
