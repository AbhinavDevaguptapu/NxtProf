// Onboarding Step 2

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const ResourceList = ({ resources, clickedResources, setClickedResources, onBack, onContinue, allResourcesClicked }) => {
  const handleClick = (url) => {
    setClickedResources({ ...clickedResources, [url]: true });
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-5 border-b-4 border-teal-500">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">🔗 Important Resources</h2>
      <ul className="list-disc list-inside space-y-2">
        {resources.map((res, index) => (
          <li key={index}>
            <a
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick(res.url)}
              className={`transition-colors duration-300 ${clickedResources[res.url] ? 'text-pink-600 hover:text-pink-700' : 'text-blue-600 hover:text-blue-700'
                } font-medium`}
            >
              {res.label}
            </a>
            {res.note && <span className="ml-2 text-sm text-gray-500">({res.note})</span>}
          </li>
        ))}
      </ul>
      <div className="text-center mt-6 space-x-4">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500"
        >
          Back to Video
        </button>

        <Tooltip delayDuration={100 /*defines delay */}>
          <TooltipTrigger asChild>
            <button
              onClick={onContinue}
              disabled={!allResourcesClicked}
              className={`px-6 py-2 rounded-full font-semibold transition duration-300 ${allResourcesClicked
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              Continue to Checklist
            </button>
          </TooltipTrigger>

          {!allResourcesClicked && (
            <TooltipContent
              side="top"
              className="bg-gray-900 text-white rounded-md px-3 py-2 text-sm shadow-lg animate-fade-in"
            >
              Please view all resources to continue
            </TooltipContent>
          )}
        </Tooltip>

      </div>
    </div>
  );
};

export default ResourceList;
