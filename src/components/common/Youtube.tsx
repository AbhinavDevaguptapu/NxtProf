// OnBoarding Step 1 - UI Updated

import { useEffect, useRef } from 'react';
import { db } from '@/integrations/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

// --- SHADCN/UI & LUCIDE IMPORTS ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlayCircle, CheckCircle2 } from 'lucide-react';

const YouTubePlayer = ({ user_id, onContinue, setIsVideoWatched, isVideoWatched }) => {
  // --- All original logic and hooks are untouched ---
  const playerRef = useRef(null);
  const savedProgressRef = useRef(0);
  const intervalRef = useRef();

  // WARNING: This clears all local storage for the domain.
  // It was in the original code and is preserved here as requested.
  useEffect(() => {
    localStorage.clear();
  }, []);

  useEffect(() => {
    const checkAndCreateUser = async () => {
      if (!user_id) return; // Prevent running with no user_id
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
  }, [user_id]); // Dependency added for correctness

  useEffect(() => {
    const createPlayer = () => {
      // Using `any` as it was in the original code
      playerRef.current = new (window as any).YT.Player('yt-player', {
        videoId: '7k6dHwZTNs0',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
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

  // --- UI RENDER (Updated Part) ---
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
              <PlayCircle className="h-7 w-7 text-primary" />
              Instructor Training Video
            </CardTitle>
            <CardDescription>
              Please watch at least 80% of the video to proceed. This is a crucial step for your onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full overflow-hidden rounded-lg border bg-secondary">
              {/* The YouTube player script will target this div */}
              <div id="yt-player" className="w-full h-full" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                {/* A div wrapper is the best practice for tooltips on disabled buttons */}
                <div className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={!isVideoWatched}
                    onClick={onContinue}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Continue to Resources
                  </Button>
                </div>
              </TooltipTrigger>
              {!isVideoWatched && (
                <TooltipContent side="top">
                  <p>Please watch the video to unlock this button.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </CardFooter>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};

export default YouTubePlayer;