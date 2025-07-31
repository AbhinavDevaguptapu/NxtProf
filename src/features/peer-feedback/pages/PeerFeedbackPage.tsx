
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, MessageSquare, Send, UserCheck, Edit } from 'lucide-react';
import RequestFeedbackForm from "../components/RequestFeedbackForm";
import ReceivedFeedbackList from "../components/ReceivedFeedbackList";
import PendingRequestsList from "../components/PendingRequestsList";
import GiveFeedbackForm from "../components/GiveFeedbackForm";
import { useReceivedFeedback } from "../hooks/useReceivedFeedback";
import { usePendingRequests } from "../hooks/usePendingRequests";

const PeerFeedbackPage = () => {
    const { feedback, isLoading: isLoadingFeedback, refresh: refreshFeedback } = useReceivedFeedback();
    const { requests, isLoading: isLoadingRequests, refresh: refreshRequests } = usePendingRequests();

    const handleFeedbackGiven = () => {
        // When a user gives feedback, their pending request list might change
        refreshRequests();
    };

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
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Peer Feedback</h1>
                <p className="text-muted-foreground mt-1">
                    Give, receive, and request constructive feedback within your team.
                </p>
            </header>

            <Tabs defaultValue="received" className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 h-auto md:h-10">
                    <TabsTrigger value="received" className="relative">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Received
                        {feedback.length > 0 && (
                            <Badge className="ml-2  ">{feedback.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="give">
                        <Edit className="w-4 h-4 mr-2" />
                        Give Feedback
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Pending Requests
                        {requests.length > 0 && (
                            <Badge variant="destructive" className="ml-2">{requests.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="request">
                        <Send className="w-4 h-4 mr-2" />
                        Request Feedback
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="received" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Feedback</CardTitle>
                            <div className="flex items-center text-sm text-muted-foreground pt-1">
                                <ShieldCheck className="w-4 h-4 mr-2 text-green-500" />
                                <span>All feedback you receive is 100% anonymous.</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ReceivedFeedbackList
                                feedback={feedback.map(item => ({ ...item, finalRating }))}
                                isLoading={isLoadingFeedback}
                                refresh={refreshFeedback}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="give" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Give Feedback</CardTitle>
                            <CardDescription>
                                Provide anonymous feedback to a colleague.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <GiveFeedbackForm onFeedbackSubmitted={handleFeedbackGiven} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Requests</CardTitle>
                            <CardDescription>
                                Feedback requests from your colleagues that are waiting for your response.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PendingRequestsList
                                requests={requests}
                                isLoading={isLoadingRequests}
                                onFeedbackSubmitted={handleFeedbackGiven}
                                refreshRequests={refreshRequests}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="request" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Request Feedback</CardTitle>
                            <CardDescription>
                                Ask a colleague for their valuable feedback on a specific topic.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RequestFeedbackForm />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PeerFeedbackPage;
