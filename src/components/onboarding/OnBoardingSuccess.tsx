// Onboarding Success - UI Updated

import { ViewState } from '@/layout/AppShell';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// --- SHADCN/UI & LUCIDE IMPORTS ---
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PartyPopper, ArrowRight } from 'lucide-react';

// A dedicated component for the animated checkmark graphic
const AnimatedCheck = () => {
  const checkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1, bounce: 0 },
        opacity: { duration: 0.1 }
      }
    }
  };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="100"
      height="100"
      viewBox="0 0 24 24"
      className="text-green-500 mx-auto mb-4"
    >
      <motion.path
        d="M5 13l4 4L19 7"
        fill="transparent"
        strokeWidth="2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={checkVariants}
        initial="hidden"
        animate="visible"
      />
    </motion.svg>
  );
};

interface OnboardingSuccessProps {
  setActiveView: (view: ViewState) => void;
}


const OnboardingSuccess = ({ setActiveView }: OnboardingSuccessProps) => {
  const handleNavigate = () => {
    setActiveView({ view: 'home' });
  };

  return (
    // The Dialog component provides the overlay and accessible modal structure
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md text-center"
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing by clicking outside
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <DialogHeader>
            <div className="mx-auto mb-4">
              <AnimatedCheck />
            </div>
            <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <PartyPopper className="h-6 w-6 text-primary" />
              Onboarding Complete!
            </DialogTitle>
            <DialogDescription className="text-lg mt-2">
              Congratulations! You've successfully completed all the required steps. You are now ready to begin.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 sm:flex-col sm:space-y-2">
            <Button
              size="lg"
              className="w-full"
              onClick={handleNavigate}
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              className="w-full"
              variant="outline"
              onClick={handleNavigate}
            >
              Close
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingSuccess;
