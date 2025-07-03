// Onboarding Step 3 - UI Updated

import { useState } from 'react';
import { db } from '../integrations/firebase/client';
import { doc, updateDoc } from 'firebase/firestore';
import OnboardingSuccess from './OnBoardingSuccess';
import { motion } from 'framer-motion';

// --- SHADCN/UI & LUCIDE IMPORTS ---
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { ListChecks, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const Checklist = ({
  user_id,
  checklistItems,
  checkedItems,
  setCheckedItems,
  isVideoWatched,
  assessmentCompleted,
  setShowAssessment,
  allChecked,
  score,
  onBack
}) => {
  // --- All original logic and hooks are untouched ---
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (item) => {
    // This logic is preserved from the original component
    if (item === 'Watched Instructor Training Video' && isVideoWatched) return;
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleSubmit = async () => {
    if (!allChecked) return;

    if (user_id) {
      const userRef = doc(db, 'userOnboardingStatus', user_id);
      try {
        await updateDoc(userRef, { onboarding_status: 'COMPLETED', completedAt: new Date().toISOString() });
        setShowSuccess(true);
      } catch (err) {
        console.error("Failed to update user status:", err);
      }
    } else {
      console.error("Cannot submit: user_id is missing.");
    }
  };

  // --- UI RENDER (Updated Part) ---
  if (showSuccess) {
    return <OnboardingSuccess />;
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card className="max-w-3xl mx-auto w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ListChecks className="h-7 w-7 text-primary" />
              Final Checklist
            </CardTitle>
            <CardDescription>
              Complete all items below to finalize your onboarding process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checklistItems.map((item, idx) => {
                const isVideoItem = item === 'Watched Instructor Training Video';
                const isChecked = isVideoItem ? isVideoWatched : !!checkedItems[item];

                return (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg bg-secondary/30">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`item-${idx}`}
                        checked={isChecked}
                        onCheckedChange={() => handleChange(item)}
                        disabled={isVideoItem}
                        aria-label={item}
                      />
                      <label
                        htmlFor={`item-${idx}`}
                        className={`text-sm font-medium leading-none ${isVideoItem && isChecked ? 'text-muted-foreground' : 'text-foreground'}`}
                      >
                        {item}
                      </label>
                    </div>

                    {isVideoItem && (
                      <div className="flex items-center gap-3 w-full sm:w-auto pl-7 sm:pl-0">
                        {assessmentCompleted && (
                          <Badge variant={score >= 50 ? 'default' : 'destructive'}>
                            {score >= 50 ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <XCircle className="mr-1 h-3.5 w-3.5" />}
                            Score: {score}%
                          </Badge>
                        )}
                        <Button
                          onClick={() => setShowAssessment(true)}
                          className="w-full sm:w-auto"
                          variant={assessmentCompleted ? "secondary" : "default"}
                        >
                          {!assessmentCompleted && <AlertTriangle className="mr-2 h-4 w-4" />}
                          {assessmentCompleted ? 'Retake Assessment' : 'Take Assessment'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between w-full gap-3 pt-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resources
            </Button>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={!allChecked}
                    onClick={handleSubmit}
                  >
                    Complete Onboarding
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              {!allChecked && (
                <TooltipContent>
                  <p>Please complete all items to submit.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </CardFooter>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};

export default Checklist;