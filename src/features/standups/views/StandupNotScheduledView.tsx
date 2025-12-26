import { motion, Variants } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarClock } from "lucide-react";

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

export const StandupNotScheduledView = () => {
  return (
    <motion.div
      key="no-standup"
      className="flex-grow flex items-center justify-center p-4"
      {...pageAnimationProps}
    >
      <Alert className="max-w-md border-blue-400 text-blue-800">
        <CalendarClock className="h-4 w-4" />
        <AlertTitle>Standup Automation</AlertTitle>
        <AlertDescription>
          Standups are automatically scheduled for 8:45 AM every day, except
          Sundays. The session will start automatically.
        </AlertDescription>
      </Alert>
    </motion.div>
  );
};
