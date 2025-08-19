import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, MessageSquare, Edit } from 'lucide-react';
import ReceivedFeedbackList from "../components/ReceivedFeedbackList";
import EmployeeFeedbackList from "../components/EmployeeFeedbackList";
import { useReceivedFeedback } from "../hooks/useReceivedFeedback";

const PeerFeedbackPage = () => {
    const { feedback, isLoading: isLoadingFeedback } = useReceivedFeedback();


    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Peer Feedback</h1>
                <p className="text-muted-foreground mt-1">
                    Give and receive constructive feedback within your team.
                </p>
            </header>

            <Tabs defaultValue="received" className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 h-auto md:h-10">
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
                                feedback={feedback}
                                isLoading={isLoadingFeedback}
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
                            <EmployeeFeedbackList />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PeerFeedbackPage;
