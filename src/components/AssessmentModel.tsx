import { useState } from 'react';

const AssessmentModal = ({ user_id, questions, onClose, setAssessmentCompleted, setScore }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState('');

  const handleAnswer = (option) => {
    const correctAnswer = questions[currentQuestion].answer;
    const isCorrect = option === correctAnswer;
    setFeedback(isCorrect ? '✅ Correct!' : `❌ Incorrect. Correct Answer: ${correctAnswer}`);
  };

  const handleNext = () => {
    const correct = feedback.includes('Correct');
    const updated = [
      ...answers,
      {
        question: questions[currentQuestion].question,
        selected: feedback.includes('Incorrect') ? '' : questions[currentQuestion].answer,
        correct
      }
    ];
    setAnswers(updated);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setFeedback('');
    } else {
      const correctCount = updated.filter((a) => a.correct).length;
      const finalScore = (correctCount / questions.length) * 100;
      setScore(finalScore);
      setAssessmentCompleted(true);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xl">
        <h3 className="text-xl font-bold mb-4">Assessment Question</h3>
        <p className="mb-4">{questions[currentQuestion].question}</p>
        <div className="space-y-2 mb-4">
          {questions[currentQuestion].options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(opt)}
              className="w-full text-left px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              disabled={!!feedback}
            >
              {opt}
            </button>
          ))}
        </div>
        {feedback && <p className="text-center mb-4 font-semibold">{feedback}</p>}
        <div className="flex justify-end">
          {feedback && (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentModal;
