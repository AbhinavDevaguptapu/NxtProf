import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const quotes = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
  },
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "The best way to predict the future is to create it.",
    author: "Peter Drucker",
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
  {
    text: "Act as if what you do makes a difference. It does.",
    author: "William James",
  },
  {
    text: "The mind is everything. What you think you become.",
    author: "Buddha",
  },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  {
    text: "The journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
  },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  {
    text: "I have not failed. I've just found 10,000 ways that won't work.",
    author: "Thomas A. Edison",
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
  },
  {
    text: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
    author: "Zig Ziglar",
  },
  {
    text: "Strive not to be a success, but rather to be of value.",
    author: "Albert Einstein",
  },
  {
    text: "You miss 100% of the shots you don't take.",
    author: "Wayne Gretzky",
  },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  {
    text: "If you are not willing to risk the usual, you will have to settle for the ordinary.",
    author: "Jim Rohn",
  },
  {
    text: "All our dreams can come true, if we have the courage to pursue them.",
    author: "Walt Disney",
  },
  {
    text: "Don't be afraid to give up the good to go for the great.",
    author: "John D. Rockefeller",
  },
  {
    text: "The successful warrior is the average man, with laser-like focus.",
    author: "Bruce Lee",
  },
  {
    text: "It is never too late to be what you might have been.",
    author: "George Eliot",
  },
  {
    text: "Everything you’ve ever wanted is on the other side of fear.",
    author: "George Addair",
  },
  {
    text: "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Franklin D. Roosevelt",
  },
  { text: "What we think, we become.", author: "Buddha" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra" },
  {
    text: "Your time is limited, don't waste it living someone else's life.",
    author: "Steve Jobs",
  },
  {
    text: "A person who never made a mistake never tried anything new.",
    author: "Albert Einstein",
  },
  {
    text: "I would rather die of passion than of boredom.",
    author: "Vincent van Gogh",
  },
  {
    text: "Build your own dreams, or someone else will hire you to build theirs.",
    author: "Farrah Gray",
  },
  {
    text: "The question isn’t who is going to let me; it’s who is going to stop me.",
    author: "Ayn Rand",
  },
  {
    text: "A creative man is motivated by the desire to achieve, not by the desire to beat others.",
    author: "Ayn Rand",
  },
  {
    text: "If you want to lift yourself up, lift up someone else.",
    author: "Booker T. Washington",
  },
  {
    text: "Limitations live only in our minds. But if we use our imaginations, our possibilities become limitless.",
    author: "Jamie Paolinetti",
  },
  {
    text: "The first step toward success is taken when you refuse to be a captive of the environment in which you first find yourself.",
    author: "Mark Caine",
  },
  {
    text: "When I dare to be powerful, to use my strength in the service of my vision, then it becomes less and less important whether I am afraid.",
    author: "Audre Lorde",
  },
  {
    text: "A successful man is one who can lay a firm foundation with the bricks others have thrown at him.",
    author: "David Brinkley",
  },
  {
    text: "No one can make you feel inferior without your consent.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "The future starts today, not tomorrow.",
    author: "Pope John Paul II",
  },
  {
    text: "Do what you can, with what you have, where you are.",
    author: "Theodore Roosevelt",
  },
  {
    text: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill",
  },
  {
    text: "The secret to success is to know something nobody else knows.",
    author: "Aristotle Onassis",
  },
  {
    text: "I find that the harder I work, the more luck I seem to have.",
    author: "Thomas Jefferson",
  },
  {
    text: "Don't let yesterday take up too much of today.",
    author: "Will Rogers",
  },
  {
    text: "You learn more from failure than from success. Don’t let it stop you. Failure builds character.",
    author: "Unknown",
  },
  {
    text: "It’s not whether you get knocked down, it’s whether you get up.",
    author: "Vince Lombardi",
  },
  {
    text: "If you are working on something that you really care about, you don’t have to be pushed. The vision pulls you.",
    author: "Steve Jobs",
  },
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
      <p className="text-lg font-medium">&quot;{currentQuote.text}&quot;</p>
      <p className="text-sm text-muted-foreground mt-2">
        - {currentQuote.author}
      </p>
    </motion.div>
  );
};

export default MotivationalQuote;
