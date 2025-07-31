
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import SubmitFeedbackModal from './SubmitFeedbackModal';
import { FeedbackRequest } from '../hooks/usePendingRequests';
import { Loader2, RefreshCw, MessageSquare } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useUserAuth } from '@/context/UserAuthContext';
import { toast } from "sonner";

interface PendingRequestsListProps {
    requests: FeedbackRequest[];
    isLoading: boolean;
    onFeedbackSubmitted: () => void;
    refreshRequests: () => void;
}

const PendingRequestsList = ({ requests, isLoading, onFeedbackSubmitted, refreshRequests }: PendingRequestsListProps) => {
    const [selectedRequest, setSelectedRequest] = useState<FeedbackRequest | null>(null);
    const { user } = useUserAuth();

    useEffect(() => {
        const removeFulfilledRequests = async () => {
            if (!user || requests.length === 0) return;

            const feedbackCollection = collection(db, 'givenPeerFeedback');

            for (const request of requests) {
                const q = query(
                    feedbackCollection,
                    where('giverId', '==', user.uid),
                    where('targetId', '==', request.requesterId),
                    where('createdAt', '>', request.createdAt)
                );

                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    try {
                        await deleteDoc(doc(db, 'peerFeedbackRequests', request.id));
                        console.log(`Removed fulfilled request ${request.id}`);
                        refreshRequests();
                    } catch (error) {
                        console.error("Error removing fulfilled request: ", error);
                    }
                }
            }
        };

        removeFulfilledRequests();
    }, [requests, user, refreshRequests]);

    const uniqueRequests = useMemo(() => {
        const grouped = new Map<string, FeedbackRequest[]>();
        
        requests.forEach(request => {
            if (!grouped.has(request.requesterId)) {
                grouped.set(request.requesterId, []);
            }
            grouped.get(request.requesterId)!.push(request);
        });

        return Array.from(grouped.values()).map(group => 
            group.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0]
        );
    }, [requests]);

    const handleGiveFeedbackClick = async (request: FeedbackRequest) => {
        if (!user) {
            toast.error("You must be logged in to perform this action.");
            return;
        }

        const feedbackCollection = collection(db, 'givenPeerFeedback');
        const q = query(
            feedbackCollection,
            where('giverId', '==', user.uid),
            where('targetId', '==', request.requesterId),
            where('createdAt', '>', request.createdAt)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            toast.info("You have already provided feedback for this request.");
            try {
                await deleteDoc(doc(db, 'peerFeedbackRequests', request.id));
                refreshRequests();
            } catch (error) {
                console.error("Error removing stale request:", error);
                toast.error("Could not remove the stale request.");
            }
        } else {
            setSelectedRequest(request);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading requests...</p>
            </div>
        );
    }

    if (uniqueRequests.length === 0) {
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
            <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                    {uniqueRequests.length} pending request{uniqueRequests.length !== 1 ? 's' : ''}
                </div>
                <Button variant="outline" size="sm" onClick={refreshRequests}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>
            <ScrollArea className="h-[400px] w-full">
                <div className="space-y-4">
                    {uniqueRequests.map((request) => (
                        <Card key={request.id}>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Request from {request.requesterName}
                                </CardTitle>
                                <CardDescription>
                                    Latest request: {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm p-3 bg-muted rounded-lg">{request.message}</p>
                                <Button onClick={() => handleGiveFeedbackClick(request)}>Give Feedback</Button>
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
