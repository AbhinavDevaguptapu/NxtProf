import { useState } from 'react';
import YouTubePlayer from './Youtube';
import ResourceList from './ResourceList';
import Checklist from './Checklist';
import AssessmentModal from './AssessmentModel';

const resources = [
  { label: 'Learning Portal', url: 'https://learning.ccbp.in/', note: 'Login with Number: 9160909057 | OTP: 987654' },
  { label: 'Instructor Handbook', url: 'https://abhinavd.gitbook.io/niat-offline-instructor-handbook/' },
  { label: 'Daily Schedule', url: 'https://docs.google.com/spreadsheets/d/1gNDLTXyDETmJGY4dlX2ZWUF4YTxjQ3DVzuWPmnhHFuk/edit?gid=162546809#gid=162546809' },
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

const InstructorOnboarding = ({ user_id }) => {
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

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-inter">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">📚 Instructor Onboarding Kit</h1>

      {step === 1 && (
        <YouTubePlayer
          user_id={user_id}
          onContinue={() => setStep(2)}
          setIsVideoWatched={setIsVideoWatched}
          isVideoWatched={isVideoWatched}
        />
      )}

      {step === 2 && (
        <ResourceList
          user_id={user_id}
          resources={resources}
          clickedResources={clickedResources}
          setClickedResources={setClickedResources}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
          allResourcesClicked={allResourcesClicked}
        />
      )}

      {step === 3 && (
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
      )}

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
  );
};

export default InstructorOnboarding;
