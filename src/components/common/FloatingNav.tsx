import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { ViewState } from '@/layout/AppShell';

interface FloatingNavProps {
    setActiveView: (view: ViewState) => void;
}

const FloatingNav = ({ setActiveView }: FloatingNavProps) => {
    return (
        <div className="fixed bottom-4 right-4 z-50 md:hidden">
            <motion.button
                onClick={() => setActiveView({ view: 'home' })}
                className="bg-primary text-primary-foreground rounded-full p-4 shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <Home />
            </motion.button>
        </div>
    );
};

export default FloatingNav;