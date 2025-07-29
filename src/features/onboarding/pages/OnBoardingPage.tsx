import InstructorOnboarding from '@/components/onboarding/OnboardingKitRoute';


import { useUserAuth } from '@/context/UserAuthContext';
import { ViewState } from "@/layout/AppShell";

interface OnboardingPageProps {
  setActiveView: (view: ViewState) => void;
}

export default function OnboardingVideoPage({ setActiveView }: OnboardingPageProps) {

  const { user } = useUserAuth();

  if (!user) {
    // This case is handled by ProtectedRoute, but as a fallback:
    return <div>Loading user...</div>;
  }

  return (
    <InstructorOnboarding user_id={user.uid} setActiveView={setActiveView} />
  );
}
