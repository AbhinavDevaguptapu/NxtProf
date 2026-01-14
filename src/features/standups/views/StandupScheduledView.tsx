import { format } from "date-fns";
import { motion, Variants } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Calendar, Clock, Users, Sparkles } from "lucide-react";
import type { Standup } from "../types";

// [LOGIC PRESERVED] - Animation variants unchanged
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

// [LOGIC PRESERVED] - Props interface unchanged
interface StandupScheduledViewProps {
  standup: Standup;
}

export const StandupScheduledView = ({
  standup,
}: StandupScheduledViewProps) => (
  <motion.div
    key="scheduled"
    className="flex-grow flex items-center justify-center p-4 min-h-[50vh]"
    {...pageAnimationProps}
  >
    <Card className="text-center max-w-lg w-full mx-auto rounded-2xl border-border/50 shadow-xl overflow-hidden">
      {/* Decorative Header Background */}
      <div className="relative bg-muted/20 pt-10 pb-16">
        {/* Decorative elements */}
        <div
          className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/30 rounded-full blur-2xl"
          aria-hidden="true"
        />

        {/* Floating Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto bg-card rounded-2xl h-20 w-20 flex items-center justify-center shadow-lg border border-border/50"
          >
            <Calendar className="h-10 w-10 text-primary" aria-hidden="true" />
          </motion.div>
        </motion.div>
      </div>

      <CardHeader className="pb-4 pt-0 -mt-8 relative z-10">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 mx-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>Scheduled</span>
          </div>

          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
            Team&apos;s Daily Standup
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base mt-2">
            Scheduled for today at{" "}
            <span className="font-semibold text-foreground">
              {/* [LOGIC PRESERVED] - Time formatting unchanged */}
              {format(standup.scheduledTime.toDate(), "p")}
            </span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pb-8 px-8 space-y-4">
        {/* Time Display Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/30">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-foreground tabular-nums">
                {format(standup.scheduledTime.toDate(), "h:mm a")}
              </p>
              <p className="text-xs text-muted-foreground">Start Time</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/30">
            <div className="p-2 rounded-lg bg-secondary">
              <Users
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-foreground">Team</p>
              <p className="text-xs text-muted-foreground">All members</p>
            </div>
          </div>
        </div>

        {/* Auto Start Notice */}
        <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <p className="text-sm font-medium text-foreground">
            The session will start automatically
          </p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);
