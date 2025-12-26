import { format } from "date-fns";
import { motion, Variants } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "lucide-react";
import type { Standup } from "../types";

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

interface StandupScheduledViewProps {
  standup: Standup;
}

export const StandupScheduledView = ({
  standup,
}: StandupScheduledViewProps) => (
  <motion.div
    key="scheduled"
    className="flex-grow flex items-center justify-center p-4"
    {...pageAnimationProps}
  >
    <Card className="text-center p-8 max-w-lg mx-auto rounded-xl border-gray-200">
      <CardHeader className="mb-4">
        <div className="mx-auto bg-gray-100 text-black rounded-full h-16 w-16 flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-extrabold text-gray-900">
          Team&apos;s Daily Standup
        </CardTitle>
        <CardDescription className="text-gray-600 text-md mt-2">
          Scheduled for{" "}
          <span className="font-semibold text-black">
            {format(standup.scheduledTime.toDate(), "p")}
          </span>{" "}
          today.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-md text-gray-800 bg-gray-100 p-3 rounded-lg">
          The session will start automatically.
        </p>
      </CardContent>
    </Card>
  </motion.div>
);
