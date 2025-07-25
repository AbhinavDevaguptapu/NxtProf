import { motion, Variants } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { ScheduleStandupForm } from "../components/ScheduleStandupForm";

const pageAnimationProps: {
    variants: Variants;
    initial: string;
    animate: string;
    exit: string;
} = {
    variants: {
        initial: { opacity: 0, y: 20 },
        animate: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, ease: "easeInOut" },
        },
        exit: {
            opacity: 0,
            y: -20,
            transition: { duration: 0.3, ease: "easeInOut" },
        },
    },
    initial: "initial",
    animate: "animate",
    exit: "exit",
};

interface StandupNotScheduledViewProps {
    isAdmin: boolean;
    todayDocId: string;
    adminName: string;
    onSuccess: () => void;
}

export const StandupNotScheduledView = ({ isAdmin, todayDocId, adminName, onSuccess }: StandupNotScheduledViewProps) => {
    if (isAdmin) {
        return (
            <motion.div
                key="schedule"
                className="flex-grow flex items-center justify-center p-4"
                {...pageAnimationProps}
            >
                <ScheduleStandupForm
                    todayDocId={todayDocId}
                    adminName={adminName}
                    onSuccess={onSuccess}
                />
            </motion.div>
        );
    }
    return (
        <motion.div
            key="no-standup"
            className="flex-grow flex items-center justify-center p-4"
            {...pageAnimationProps}
        >
            <Alert className="max-w-md border-gray-400 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Standup Scheduled</AlertTitle>
                <AlertDescription>
                    There is no standup scheduled for today. Please check back later.
                </AlertDescription>
            </Alert>
        </motion.div>
    );
};
