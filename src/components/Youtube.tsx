// OnBoarding Step 1

import { useEffect, useRef } from 'react';
import { db } from '../integrations/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const YouTubePlayer = ({ user_id, onContinue, setIsVideoWatched, isVideoWatched }) => {
  const playerRef = useRef(null);
  const savedProgressRef = useRef(0);
  const intervalRef = useRef();
  useEffect(() => {
    localStorage.clear();
  }, []);

  useEffect(() => {
    const checkAndCreateUser = async () => {
      const onboardingRef = doc(db, 'userOnboardingStatus', user_id);
      const docSnap = await getDoc(onboardingRef);

      if (!docSnap.exists()) {
        await setDoc(onboardingRef, {
          onboarding_status: 'INPROGRESS',
          user_id: user_id,
        });
        console.log("New user added:", user_id);
      } else {
        console.log("User already exists:", user_id);
      }
    };

    checkAndCreateUser();
  }, []);

  useEffect(() => {
    const createPlayer = () => {
      playerRef.current = new (window as any).YT.Player('yt-player', {
        videoId: '7k6dHwZTNs0',
        playerVars: { autoplay: 1 },
        events: {
          onReady: (event) => {
            event.target.seekTo(savedProgressRef.current);
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              (intervalRef as any).current = setInterval(() => {
                const currentTime = playerRef.current.getCurrentTime();
                savedProgressRef.current = currentTime;
                const duration = playerRef.current.getDuration();

                if (duration > 0) {
                  const progress = (currentTime / duration) * 100;
                  console.log({ currentTime, duration, progress });

                  if (progress >= 80) {
                    setIsVideoWatched(true);
                    clearInterval(intervalRef.current);
                  }
                }
              }, 1000);
            } else {
              clearInterval(intervalRef.current);
            }
          },
        },
      });
    };

    const loadPlayer = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        createPlayer();
      } else {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
        (window as any).onYouTubeIframeAPIReady = createPlayer;
      }
    };

    loadPlayer();

    return () => {
      clearInterval(intervalRef.current);
      delete (window as any).onYouTubeIframeAPIReady;
    };
  }, [setIsVideoWatched]);

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-5 border-b-4 border-blue-500">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">📹 Instructor Training Video</h2>
      <div className="aspect-video w-full mb-4">
        <div id="yt-player" className="w-full h-96 rounded-lg border-2 border-gray-300"></div>
      </div>
      <div className="text-center">
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              disabled={!isVideoWatched}
              onClick={onContinue}
              className={`px-6 py-2 rounded-full font-semibold transition duration-300 ${isVideoWatched
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              Continue to Resources
            </button>
          </TooltipTrigger>

          {!isVideoWatched && (
            <TooltipContent
              side="top"
              className="bg-gray-900 text-white rounded-md px-3 py-2 text-sm shadow-lg animate-fade-in"
            >
              Please watch the video to continue
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
};

export default YouTubePlayer;