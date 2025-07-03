// Main Onboarding Component - UI Updated

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CHILD COMPONENT IMPORTS ---
import YouTubePlayer from './Youtube';
import ResourceList from './ResourceList';
import Checklist from './Checklist';
import AssessmentModal from './AssessmentModel';

// --- LUCIDE ICONS FOR STEPPER ---
import { Check, Circle, MousePointer, Link2, ListChecks } from 'lucide-react';

// --- CONSTANTS (Data is unchanged) ---
const resources = [
  { label: 'Learning Portal', url: 'https://learning.ccbp.in/', note: 'Login with Number: 9160909057 | OTP: 987654' },
  { label: 'Instructor Handbook', url: 'https://abhinavd.gitbook.io/niat-offline-instructor-handbook/' },
  { label: 'Daily Schedule', url: 'https://docs.google.com/spreadsheets/d/1gNDLTXyDETmJGY4dlX2ZWUF4YTxjQ3DVzuWPmnhHFuk/edit?gid=162546809#gid=162546g' },
  { label: 'Instructor Worklog Sheet', url: 'https://docs.google.com/spreadsheets/d/1FzF9RaAL9LnAGTSHKRquntCU7zK-aNPzbSE-bOfJ19w/edit?pli=1&gid=495223418#gid=495223418' },
  { label: 'Session & Progress Tracker', url: 'https://docs.google.com/spreadsheets/d/1uhYNuDrvj0MWC2mfWQQPS2YYdiF_5u_3obyhuI983B8/edit?gid=826768177#gid=826768177' },
  { label: 'Learning Hours Sheet', url: 'https://docs.google.com/spreadsheets/d/1RIEItNyirXEN_apxmYOlWaV5-rrTxJucyz6-kDu9dWA/edit?pli=1&gid=1475218293#gid=1475218293' },
  { label: 'WhatsApp: Instructors', url: 'https://chat.whatsapp.com/K0QqilI8gUu3NLLM06KxfM' },
  { label: 'WhatsApp: NIAT Staff', url: 'https://chat.whatsapp.com/G38iiJ9hXWvJRzU2XfRoWy' },
  { label: 'WhatsApp: NIAT Facilities - Coordination', url: 'https://chat.whatsapp.com/LJmxUAdcGgMFSN42mX0hcy' },
  { label: 'Monthly Goal Planning Doc Template', url: 'https://docs.google.com/spreadsheets/d/1Imx7XMuIA-FPwZfX7r2rYnoCsDEpsPYaFNDB7bakFbg/edit?usp=sharing' }
];
const checklistItems = [
  'Watched Instructor Training Video',
  'Visited all documentation links',
  'Joined WhatsApp & Teams groups',
  'Reviewed daily & worklog sheets',
];
const mcqQuestions = [
  { question: 'What are the responsibilities and expectations from a NxtWave Tech Educator?', options: ['Simplify complex concepts', 'Be thorough with the standard practices and guidelines', 'Work with different teams to ensure quality', 'All of the above'], answer: 'All of the above' },
  { question: 'Which statement is incorrect?', options: ['Assume that the users are completely new to the topic', 'Explain every Technical term', 'Change the facts', 'Clearly understand the intent and meaning'], answer: 'Change the facts' },
  { question: 'What are the requirements for recording?', options: ['Laptop', 'Dark Background', 'Noisy place', 'None of the above'], answer: 'Laptop' },
  { question: 'How to ensure good session delivery?', options: ['Content & Explanation', 'Body language & Tonality', 'Speaker Tips', 'All of the above'], answer: 'All of the above' },
  { question: 'Choose the correct statement.', options: ['Maintain a fast pace', 'Summarize after every section', 'It is ok to pronounce the word in not so clear way', 'Make it sound complicated'], answer: 'Summarize after every section' }
];
const onboardingSteps = [
  { name: 'Training Video', icon: MousePointer },
  { name: 'Resources', icon: Link2 },
  { name: 'Final Checklist', icon: ListChecks }
];

// --- Stepper Component ---
const OnboardingStepper = ({ currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {onboardingSteps.map((stepInfo, stepIdx) => (
          <li key={stepInfo.name} className={`relative ${stepIdx !== onboardingSteps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {stepIdx < currentStep - 1 ? ( // Completed step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-5 w-5" />
                </div>
              </>
            ) : stepIdx === currentStep - 1 ? ( // Current step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                </div>
                <span className="absolute top-10 w-max text-center text-sm font-semibold text-primary">{stepInfo.name}</span>
              </>
            ) : ( // Upcoming step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background">
                  <Circle className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};


// --- Main Onboarding Component ---
const InstructorOnboarding = ({ user_id }) => {
  // --- All original state logic is untouched ---
  const [step, setStep] = useState(1);
  const [isVideoWatched, setIsVideoWatched] = useState(false);
  const [clickedResources, setClickedResources] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const allChecked = checklistItems.every(item =>
    item === 'Watched Instructor Training Video' ? isVideoWatched && assessmentCompleted : checkedItems[item]
  );
  const allResourcesClicked = resources.every(res => clickedResources[res.url]);

  const animationVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 sm:py-12">
      <div className="container max-w-5xl mx-auto px-4">
        {/* --- HEADER --- */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold  tracking-tight">
            Instructor Onboarding Kit
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Follow the steps below to complete your setup.
          </p>
        </div>

        {/* --- VISUAL STEPPER --- */}
        <div className="flex justify-center mb-12">
          <OnboardingStepper currentStep={step} />
        </div>

        {/* --- ANIMATED STEP CONTENT --- */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={animationVariants} initial="hidden" animate="visible" exit="exit">
              <YouTubePlayer
                user_id={user_id}
                onContinue={() => setStep(2)}
                setIsVideoWatched={setIsVideoWatched}
                isVideoWatched={isVideoWatched}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={animationVariants} initial="hidden" animate="visible" exit="exit">
              <ResourceList
                resources={resources}
                clickedResources={clickedResources}
                setClickedResources={setClickedResources}
                onBack={() => setStep(1)}
                onContinue={() => setStep(3)}
                allResourcesClicked={allResourcesClicked}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={animationVariants} initial="hidden" animate="visible" exit="exit">
              <Checklist
                user_id={user_id}
                checklistItems={checklistItems}
                checkedItems={checkedItems}
                setCheckedItems={setCheckedItems}
                isVideoWatched={isVideoWatched}
                assessmentCompleted={assessmentCompleted}
                setShowAssessment={setShowAssessment}
                allChecked={allChecked}
                score={score}
                onBack={() => setStep(2)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- ASSESSMENT MODAL (rendered outside the flow) --- */}
        {showAssessment && (
          <AssessmentModal
            user_id={user_id}
            questions={mcqQuestions}
            onClose={() => setShowAssessment(false)}
            setAssessmentCompleted={setAssessmentCompleted}
            setScore={setScore}
          />
        )}
      </div>
    </div>
  );
};

export default InstructorOnboarding;