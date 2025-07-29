import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleNavigateHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <AlertTriangle className="h-24 w-24 text-primary mx-auto" />
        </motion.div>
        
        <h1 className="text-8xl font-bold tracking-tighter">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>4</motion.span>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>0</motion.span>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>4</motion.span>
        </h1>
        
        <p className="text-2xl text-muted-foreground">
          Oops! The page you're looking for has ventured off the grid.
        </p>
        
        <Button onClick={handleNavigateHome} size="lg">
          <Home className="mr-2 h-5 w-5" />
          Return to Home
        </Button>
      </motion.div>
    </div>
  );
}