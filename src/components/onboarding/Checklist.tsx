import { useState } from 'react';
import { db } from '@/integrations/firebase/client';
import { doc, updateDoc } from 'firebase/firestore';
import OnboardingSuccess from '@/components/onboarding/OnBoardingSuccess';
import { motion } from 'framer-motion';

// --- SHADCN/UI & LUCIDE IMPORTS ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ListChecks, ArrowLeft, Send, CheckCircle2, XCircle, FileQuestion, GraduationCap } from 'lucide-react';

const Checklist = ({
  user_id,
  checklistItems,
  checkedItems,
  setCheckedItems,
  passedAssessment,
  assessmentCompleted,
  setShowAssessment,
  allChecked,
  score,
  onBack
}) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (item) => {
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

  if (showSuccess) {
    return <OnboardingSuccess setActiveView={() => {}} />;
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
          <CardContent className="space-y-6">
            {/* --- Standard Checklist Items --- */}
            <div className="space-y-4">
              {checklistItems.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-4 border rounded-lg bg-secondary/30">
                  <Checkbox
                    id={`item-${idx}`}
                    checked={!!checkedItems[item]}
                    onCheckedChange={() => handleChange(item)}
                    aria-label={item}
                  />
                  <label
                    htmlFor={`item-${idx}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {item}
                  </label>
                </div>
              ))}
            </div>

            {/* --- Assessment Section --- */}
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileQuestion className="h-6 w-6 text-primary" />
                  Knowledge Check
                </CardTitle>
                <CardDescription>
                  A score of 80% or higher is required to pass the assessment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentCompleted && (
                  <div className="flex items-center gap-4 p-4 rounded-md bg-secondary">
                    <p className="text-sm font-medium text-muted-foreground flex-1">Your assessment is complete.</p>
                    <Badge variant={passedAssessment ? 'default' : 'destructive'} className="text-base">
                      {passedAssessment ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                      Score: {score}%
                    </Badge>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => setShowAssessment(true)}
                  className="w-full sm:w-auto"
                  variant={assessmentCompleted ? "secondary" : "default"}
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  {assessmentCompleted ? 'Retake Assessment' : 'Start Assessment'}
                </Button>
              </CardFooter>
            </Card>

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
                  <p>Please complete all items and pass the assessment (80%+) to submit.</p>
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