import { Button } from "@/components/ui/button";
import { useUserAuth } from "@/context/UserAuthContext";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

export default function PendingApproval() {
  const { logout, user } = useUserAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-card p-8 rounded-xl shadow-lg border text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full">
            <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Approval Pending</h1>
          <p className="text-muted-foreground">
            Hi {user?.displayName}, your account is currently awaiting administrator approval. 
            You will be able to access the platform once your request has been reviewed.
          </p>
        </div>

        <Button onClick={logout} variant="outline" className="w-full">
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
