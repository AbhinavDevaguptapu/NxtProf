import { motion, Variants } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, Clock, Info, Sparkles } from "lucide-react";

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

export const StandupNotScheduledView = () => {
  return (
    <motion.div
      key="no-standup"
      className="flex-grow flex items-center justify-center p-4 min-h-[50vh]"
      {...pageAnimationProps}
    >
      <Card className="max-w-lg w-full shadow-lg border-border/50 overflow-hidden">
        {/* Decorative Header */}
        <div className="relative bg-muted/20 p-8 pb-12">
          {/* Decorative elements */}
          <div
            className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"
            aria-hidden="true"
          />

          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/5 border border-border/50 flex items-center justify-center"
          >
            <CalendarClock
              className="h-10 w-10 text-foreground"
              aria-hidden="true"
            />
          </motion.div>
        </div>

        <CardContent className="p-6 -mt-6 relative">
          {/* Main Info Card */}
          <Alert className="border-border/50 bg-card shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                <Sparkles
                  className="h-5 w-5 text-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <AlertTitle className="text-lg font-semibold text-foreground mb-2">
                  Standup Automation
                </AlertTitle>
                <AlertDescription className="text-muted-foreground leading-relaxed">
                  Standups are automatically scheduled for{" "}
                  <span className="font-semibold text-foreground">8:45 AM</span>{" "}
                  every day, except Sundays. The session will start
                  automatically.
                </AlertDescription>
              </div>
            </div>
          </Alert>

          {/* Additional Info */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-foreground">8:45 AM</p>
                <p className="text-xs text-muted-foreground">Default time</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Info
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-foreground">15 mins</p>
                <p className="text-xs text-muted-foreground">Auto-close</p>
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>Waiting for scheduled time...</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
