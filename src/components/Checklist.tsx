// Onboarding Step 3

import { useState } from 'react';
import { db } from '../integrations/firebase/client';
import { doc, updateDoc } from 'firebase/firestore';
import OnboardingSuccess from './OnBoardingSuccess';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

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
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (item) => {
    if (item === 'Watched Instructor Training Video' && isVideoWatched) return;
    setCheckedItems({ ...checkedItems, [item]: !checkedItems[item] });
  };

  return (
    <>
      {showSuccess && <OnboardingSuccess />}
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-5 border-b-4 border-purple-500">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">✅ Checklist</h2>
        <div className="space-y-3">
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-50 p-3 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedItems[item] || (item === 'Watched Instructor Training Video' && isVideoWatched)}
                  onChange={() => handleChange(item)}
                  disabled={item === 'Watched Instructor Training Video' && isVideoWatched}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-800">{item}</span>
              </label>
              {item === 'Watched Instructor Training Video' && (
                <div className="flex items-center space-x-3">
                  {assessmentCompleted && (
                    <div className="flex items-center space-x-2">
                      <span className={`text-xl ${score >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {score >= 50 ? '✔' : '✖'}
                      </span>
                      <span className="text-sm text-gray-600">Attempted</span>
                    </div>
                  )}
                  <div className="relative inline-block">
                    {!assessmentCompleted && (
                      <span className="absolute -top-2 -left-3 text-red-500 text-lg">*</span>
                    )}
                    <button
                      onClick={() => {
                        setShowAssessment(true);
                      }}
                      className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      {assessmentCompleted ? 'Retake Assessment' : 'Take Assessment'}
                    </button>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500 m-5"
        >
          Back to Resources
        </button>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              onClick={async () => {
                if (!allChecked) return;

                if (user_id) {
                  const userRef = doc(db, 'userOnboardingStatus', user_id);
                  try {
                    await updateDoc(userRef, { onboarding_status: 'COMPLETED', user_id: user_id });
                  } catch (err) {
                    console.log(err);
                  }

                }
                else {
                  console.log("I dont have user id");
                }
                setShowSuccess(true);
              }}
              className={`px-8 py-3 rounded-full text-lg font-semibold shadow-md transition-all duration-300 ${allChecked
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transform hover:scale-105'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
              disabled={!allChecked}
            >
              Submit
            </button>
          </TooltipTrigger>

          {!allChecked && (
            <TooltipContent
              side="top"
              className="bg-gray-900 text-white rounded-md px-3 py-2 text-sm shadow-lg animate-fade-in"
            >
              Please complete all checklist items and assessment to submit
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </>
  );
};

export default Checklist;
