import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
];

const MotivationalQuote = () => {
    const [currentQuote, setCurrentQuote] = useState(quotes[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * quotes.length);
            setCurrentQuote(quotes[randomIndex]);
        }, 10000); // Change quote every 10 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            key={currentQuote.text}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card p-6 rounded-lg border shadow-sm text-center"
        >
            <Quote className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-lg font-medium">"{currentQuote.text}"</p>
            <p className="text-sm text-muted-foreground mt-2">- {currentQuote.author}</p>
        </motion.div>
    );
};

export default MotivationalQuote;
