import InstructorOnboarding from '@/components/onboarding/OnboardingKitRoute';

import AppNavbar from "@/components/common/AppNavbar";
import { Navigate } from 'react-router-dom';
import { useUserAuth } from '@/context/UserAuthContext';

export default function OnboardingVideoPage() {

  const { user } = useUserAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  console.log(user.uid)


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <InstructorOnboarding user_id={user.uid} />
    </div>
  );
}
