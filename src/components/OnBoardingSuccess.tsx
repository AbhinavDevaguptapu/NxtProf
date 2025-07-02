import { useNavigate } from 'react-router-dom';

const OnboardingSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl relative max-w-md w-full text-center">
        
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
          onClick={() => navigate('/')}
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-green-600 mb-4">🎉 Onboarding Complete!</h2>
        <p className="text-gray-700 text-lg">Thank you! You've successfully completed all onboarding steps.</p>
      </div>
    </div>
  );
};

export default OnboardingSuccess;
