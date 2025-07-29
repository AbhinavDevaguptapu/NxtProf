
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import SubmitFeedbackModal from './SubmitFeedbackModal';
import { FeedbackRequest } from '../hooks/usePendingRequests';
import { Loader2, RefreshCw } from 'lucide-react';

interface PendingRequestsListProps {
    requests: FeedbackRequest[];
    isLoading: boolean;
    onFeedbackSubmitted: () => void;
    refreshRequests: () => void;
}

const PendingRequestsList = ({ requests, isLoading, onFeedbackSubmitted, refreshRequests }: PendingRequestsListProps) => {
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
                <Button variant="outline" size="sm" onClick={refreshRequests} className="mt-4">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={refreshRequests}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>
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
