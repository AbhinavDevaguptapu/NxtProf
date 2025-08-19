import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, MessageSquare, Edit, Info, Lock } from 'lucide-react';
import ReceivedFeedbackList from "../components/ReceivedFeedbackList";
import EmployeeFeedbackList from "../components/EmployeeFeedbackList";
import { useReceivedFeedback } from "../hooks/useReceivedFeedback";
import { useUserAuth } from "@/context/UserAuthContext";
import { usePeerFeedbackLock } from "../hooks/usePeerFeedbackLock";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PeerFeedbackPage = () => {
    const { feedback, isLoading: isLoadingFeedback } = useReceivedFeedback();
    const { isAdmin } = useUserAuth();
    const { isLocked, isLoading: isLoadingLock, toggleLock } = usePeerFeedbackLock();


    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Peer Feedback</h1>
                <p className="text-muted-foreground mt-1 mb-2">
                    Give and receive constructive feedback within your team.
                </p>
                {isAdmin && (
                    <div className="flex items-center space-x-2 mb-4">
                        <Switch
                            id="feedback-lock"
                            checked={isLocked}
                            onCheckedChange={toggleLock}
                            disabled={isLoadingLock}
                        />
                        <Label htmlFor="feedback-lock">Lock Peer Feedback Submissions</Label>
                    </div>
                )}
                <Alert variant={isLocked ? "destructive" : "success"} className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        {isLocked
                            ? "Feedback submissions are currently closed. The module will reopen in the last week of the month."
                            : "The peer feedback module is now open! Please submit your feedback before the end of the month."}
                    </AlertDescription>
                </Alert>
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
                    <TabsTrigger value="give" disabled={isLocked}>
                        {isLocked ? <Lock className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
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
