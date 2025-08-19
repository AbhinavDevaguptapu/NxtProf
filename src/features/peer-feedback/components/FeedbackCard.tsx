import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Feedback } from '../types';
import { motion } from 'framer-motion';
import { Star, Users } from 'lucide-react';

interface FeedbackCardProps {
    item: Feedback;
    isAdminView?: boolean;
    giverName?: string;
    receiverName?: string;
}

const FeedbackCard = ({ item, isAdminView = false, giverName, receiverName }: FeedbackCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="transition-all hover:shadow-md">
                <CardHeader className="pb-2 flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-base">{item.projectOrTask}</CardTitle>
                    <CardDescription>
                        Received {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {isAdminView && (
                    <div className="text-sm text-muted-foreground mb-2">
                        <span>From: <strong>{giverName}</strong></span>
                        <span className="mx-2">|</span>
                        <span>To: <strong>{receiverName}</strong></span>
                    </div>
                )}
                <div className="text-sm text-muted-foreground mb-2 flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Work Efficiency: <strong>{item.workEfficiency}/5</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>Ease of Work: <strong>{item.easeOfWork}/5</strong></span>
                    </div>
                </div>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{item.remarks}</p>
            </CardContent>
        </Card>
    </motion.div>
    );
};

export default FeedbackCard;