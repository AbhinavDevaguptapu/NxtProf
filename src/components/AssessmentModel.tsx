// Assessment Modal - UI Updated with Inline Visual Feedback

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- SHADCN/UI & LUCIDE IMPORTS ---
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Progress } from './ui/progress';
import { ArrowRight, ClipboardCheck, Check, X } from 'lucide-react'; // Added Check and X icons

const AssessmentModal = ({ user_id, questions, onClose, setAssessmentCompleted, setScore }) => {
  // --- State logic updated to include feedback ---
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null); // { isCorrect: boolean, correctAnswer: string } | null

  // --- LOGIC UPDATED: Calculate and show feedback immediately ---
  const handleAnswer = (option) => {
    if (feedback) return; // Prevent changing answer after feedback is shown

    const correctAnswer = questions[currentQuestion].answer;
    const isCorrect = option === correctAnswer;
    setSelectedOption(option);
    setFeedback({ isCorrect, correctAnswer }); // Set feedback object
  };

  const handleNext = () => {
    // This logic now runs after user has seen the feedback
    const updatedAnswers = [
      ...answers,
      {
        question: questions[currentQuestion].question,
        selected: selectedOption,
        isCorrect: feedback.isCorrect
      }
    ];
    setAnswers(updatedAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      // Reset state for the next question
      setSelectedOption(null);
      setFeedback(null);
    } else {
      const correctCount = updatedAnswers.filter(a => a.isCorrect).length;
      const finalScore = (correctCount / questions.length) * 100;
      setScore(finalScore);
      setAssessmentCompleted(true);
      onClose();
    }
  };

  const progressValue = ((currentQuestion + 1) / questions.length) * 100;

  const questionVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  const iconVariants = {
    hidden: { scale: 0.5, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.2, ease: "easeOut" as const } }
  };

  // --- UI RENDER (Updated Part) ---
  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Knowledge Check
          </DialogTitle>
          <DialogDescription>
            Select an answer. The correct option will be highlighted before you proceed.
          </DialogDescription>
          <div className="pt-2">
            <Progress value={progressValue} className="w-full" />
            <p className="text-sm text-muted-foreground text-right mt-1">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[250px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              variants={questionVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <p className="text-lg font-semibold mb-4">{questions[currentQuestion].question}</p>
              <div className="space-y-3">
                {questions[currentQuestion].options.map((option, idx) => {
                  let icon = null;
                  let buttonVariant = 'outline';
                    if (feedback) {
                    const isCorrectAnswer = option === feedback.correctAnswer;
                    const isSelectedAnswer = option === selectedOption;

                    if (isCorrectAnswer) {
                      buttonVariant = 'outline';
                      icon = (
                      <Check className="h-5 w-5 text-green-600" />
                      );
                    } else if (isSelectedAnswer && !feedback.isCorrect) {
                      buttonVariant = 'destructive';
                      icon = <X className="h-5 w-5" />;
                    }
                    }

                  return (
                    <Button
                      key={idx}
                      variant={buttonVariant as "outline" | "destructive" | "default" | "secondary" | "ghost" | "link"}
                      className="w-full h-auto py-3 justify-between text-left whitespace-normal"
                      onClick={() => handleAnswer(option)}
                    >
                      <span>{option}</span>
                      <AnimatePresence>
                        {icon && (
                          <motion.div variants={iconVariants} initial="hidden" animate="visible">
                            {icon}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="mt-6">
          <Button
            size="lg"
            onClick={handleNext}
            disabled={!feedback} // Enable "Next" only after feedback is shown
            className="w-full sm:w-auto"
          >
            {currentQuestion === questions.length - 1 ? 'Finish Assessment' : 'Next Question'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentModal;