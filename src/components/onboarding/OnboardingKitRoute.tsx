import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { ViewState } from "@/layout/AppShell";

// --- CHILD COMPONENT IMPORTS ---
import YouTubePlayer from "@/components/common/Youtube";
import ResourceList from "@/components/onboarding/ResourceList";
import Checklist from "@/components/onboarding/Checklist";
import AssessmentModal from "@/components/onboarding/AssessmentModel";
import OnboardingSuccess from "@/components/onboarding/OnBoardingSuccess";

// --- LUCIDE ICONS & UI ---
import { Loader2 } from "lucide-react";

// --- CONSTANTS ---
const resources = [
  {
    label: "Learning Portal",
    url: "https://learning.ccbp.in/",
    note: "Login with Number: 9160909057 | OTP: 987654",
  },
  {
    label: "Instructor Handbook",
    url: "https://abhinavd.gitbook.io/niat-offline-instructor-handbook/",
  },
  {
    label: "Daily Schedule",
    url: "https://docs.google.com/spreadsheets/d/1gNDLTXyDETmJGY4dlX2ZWUF4YTxjQ3DVzuWPmnhHFuk/edit?gid=162546809#gid=162546809",
  },
  {
    label: "Instructor Worklog Sheet",
    url: "https://docs.google.com/spreadsheets/d/1FzF9RaAL9LnAGTSHKRquntCU7zK-aNPzbSE-bOfJ19w/edit?pli=1&gid=495223418#gid=495223418",
  },
  {
    label: "Session Count Tracker",
    url: "https://docs.google.com/spreadsheets/d/1uhYNuDrvj0MWC2mfWQQPS2YYdiF_5u_3obyhuI983B8/edit?gid=1875720795#gid=1875720795",
  },
  {
    label: "Session Progress Tracker",
    url: "https://docs.google.com/spreadsheets/d/10DRKIDUMj0YKsq3LngO69xoCCEfdl_nLIxIy0Ju0SdA/edit?gid=1955276732#gid=1955276732",
  },
  {
    label: "Learning Hours Sheet",
    url: "https://docs.google.com/spreadsheets/d/1RIEItNyirXEN_apxmYOlWaV5-rrTxJucyz6-kDu9dWA/edit?pli=1&gid=1475218293#gid=1475218293",
  },
  {
    label: "WhatsApp: Instructors",
    url: "https://chat.whatsapp.com/G4AEKtn4OJYBKWLNglrmQH",
  },
  {
    label: "WhatsApp: NIAT Staff",
    url: "https://chat.whatsapp.com/G38iiJ9hXWvJRzU2XfRoWy",
  },
  {
    label: "WhatsApp: NIAT Facilities - Coordination",
    url: "https://chat.whatsapp.com/LJmxUAdcGgMFSN42mX0hcy",
  },
  {
    label: "Monthly Goal Planning Doc Template",
    url: "https://docs.google.com/spreadsheets/d/1Imx7XMuIA-FPwZfX7r2rYnoCsDEpsPYaFNDB7bakFbg/edit?usp=sharing",
  },
];
const checklistItems = [
  "Visited all documentation links",
  "Joined WhatsApp & Teams groups",
  "Reviewed daily & worklog sheets",
];
const mcqQuestions = [
  {
    question:
      "What are the responsibilities and expectations from a NxtWave Tech Educator?",
    options: [
      "Simplify complex concepts",
      "Be thorough with the standard practices and guidelines",
      "Work with different teams to ensure quality",
      "All of the above",
    ],
    answer: "All of the above",
  },
  {
    question: "Which statement is incorrect?",
    options: [
      "Assume that the users are completely new to the topic",
      "Explain every Technical term",
      "Change the facts",
      "Clearly understand the intent and meaning",
    ],
    answer: "Change the facts",
  },
  {
    question: "What are the requirements for recording?",
    options: ["Laptop", "Dark Background", "Noisy place", "None of the above"],
    answer: "Laptop",
  },
  {
    question: "How to ensure good session delivery?",
    options: [
      "Content & Explanation",
      "Body language & Tonality",
      "Speaker Tips",
      "All of the above",
    ],
    answer: "All of the above",
  },
  {
    question: "Choose the correct statement.",
    options: [
      "Maintain a fast pace",
      "Summarize after every section",
      "It is ok to pronounce the word in not so clear way",
      "Make it sound complicated",
    ],
    answer: "Summarize after every section",
  },
];
const onboardingSteps = ["Training Video", "Resources", "Final Checklist"];

// --- Stepper Component ---
const OnboardingStepper = ({ currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex space-x-2">
        {onboardingSteps.map((stepName, stepIdx) => (
          <li key={stepName} className="flex-1">
            <div
              className={`group flex w-full flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0 
              ${stepIdx < currentStep - 1 ? "border-green-600" : ""}
              ${stepIdx === currentStep - 1 ? "border-primary" : ""}
              ${stepIdx > currentStep - 1 ? "border-border" : ""}
            `}
            >
              <span
                className={`text-sm font-medium transition-colors 
                ${stepIdx < currentStep - 1 ? "text-green-600" : ""}
                ${stepIdx === currentStep - 1 ? "text-primary" : ""}
                ${stepIdx > currentStep - 1 ? "text-muted-foreground" : ""}
              `}
              >
                Step {stepIdx + 1}
              </span>
              <span className="text-sm font-semibold">{stepName}</span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

// --- Main Onboarding Component ---
const InstructorOnboarding = ({
  user_id,
  setActiveView,
}: {
  user_id: string;
  setActiveView: (view: ViewState) => void;
}) => {
  // --- State logic ---
  const [onboardingView, setOnboardingView] = useState("loading"); // 'loading', 'onboarding', 'resourcesOnly'
  const [step, setStep] = useState(1);
  const [isVideoWatched, setIsVideoWatched] = useState(false);
  const [clickedResources, setClickedResources] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [score, setScore] = useState(0);

  // --- Check user's onboarding status on load ---
  useEffect(() => {
    const checkStatus = async () => {
      if (!user_id) {
        setOnboardingView("onboarding"); // Default to onboarding if no user
        return;
      }
      const userStatusRef = doc(db, "userOnboardingStatus", user_id);
      const docSnap = await getDoc(userStatusRef);

      if (
        docSnap.exists() &&
        docSnap.data().onboarding_status === "COMPLETED"
      ) {
        setOnboardingView("resourcesOnly");
      } else {
        setOnboardingView("onboarding");
      }
    };
    checkStatus();
  }, [user_id]);

  // --- Logic to check if all conditions are met ---
  const allResourcesClicked = resources.every(
    (res) => clickedResources[res.url]
  );
  const allStandardItemsChecked = checklistItems.every(
    (item) => !!checkedItems[item]
  );
  const passedAssessment = isVideoWatched && assessmentCompleted && score >= 80;
  const allChecked = allStandardItemsChecked && passedAssessment;

  if (allChecked) {
    return <OnboardingSuccess setActiveView={setActiveView} />;
  }

  const animationVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  // --- Conditional Rendering based on onboarding status ---

  if (onboardingView === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (onboardingView === "resourcesOnly") {
    // Add the YouTube link to the top of the resources array for returning users
    const resourcesWithVideo = [
      {
        label: "Revisit Training Video",
        url: "https://www.youtube.com/watch?v=7k6dHwZTNs0",
        note: "Watch the main training video again.",
      },
      ...resources,
    ];

    return (
      <div className="min-h-screen bg-background text-foreground py-8 sm:py-12">
        <div className="container max-w-5xl mx-auto px-4">
          <h1 className="text-3xl text-center font-semibold tracking-tight mb-8">
            Onboarding Resources
          </h1>
          {/* Render ResourceList in read-only mode, without navigation */}
          <ResourceList
            resources={resourcesWithVideo}
            clickedResources={{}}
            setClickedResources={() => {}}
            isReadOnly={true}
            onBack={undefined}
            onContinue={undefined}
            allResourcesClicked={undefined}
          />
        </div>
      </div>
    );
  }

  // --- Default: Full Onboarding Flow ---
  return (
    <div className="min-h-screen bg-background text-foreground py-8 sm:py-12">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold tracking-tight">
            Instructor Onboarding Kit
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Follow the steps below to complete your setup.
          </p>
        </div>

        <div className="mb-12">
          <OnboardingStepper currentStep={step} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={animationVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <YouTubePlayer
                user_id={user_id}
                onContinue={() => setStep(2)}
                setIsVideoWatched={setIsVideoWatched}
                isVideoWatched={isVideoWatched}
              />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={animationVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
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
            <motion.div
              key="step3"
              variants={animationVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Checklist
                user_id={user_id}
                checklistItems={checklistItems}
                checkedItems={checkedItems}
                setCheckedItems={setCheckedItems}
                passedAssessment={passedAssessment}
                assessmentCompleted={assessmentCompleted}
                setShowAssessment={setShowAssessment}
                allChecked={allChecked}
                score={score}
                onBack={() => setStep(2)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {showAssessment && (
          <AssessmentModal
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
