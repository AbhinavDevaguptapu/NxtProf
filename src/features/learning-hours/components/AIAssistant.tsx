import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  X,
  Wand2,
  Clipboard,
  ClipboardCheck,
  ChevronDown,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getLearningPointSuggestions,
  Suggestions,
} from "../services/learningPointsAIService";
import { useMediaQuery } from "@/hooks/use-media-query";

type Message = {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestions;
};

type AIAssistantProps = {
  onApplySuggestions: (suggestions: Partial<Suggestions>) => void;
};

export const AIAssistant = ({ onApplySuggestions }: AIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Auto-scroll to bottom of chat
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      setTimeout(() => {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const suggestions = await getLearningPointSuggestions(input);
      const assistantMessage: Message = {
        role: "assistant",
        content:
          "Here are some suggestions based on your situation. You can apply them directly to your form.",
        suggestions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      // Check if this is our specific validation error (starts with "Hi there")
      const isValidationError = error.message?.includes("Hi there!");

      const errorMessage: Message = {
        role: "assistant",
        // Display the actual error message from the service in the chat
        content:
          error.message ||
          "Sorry, I encountered an unexpected error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Only log to console if it's a REAL system error (not just a user validation tip)
      if (!isValidationError) {
        console.error("AI suggestion error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInput("");
  };

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={
              isMobile
                ? { y: "100%", opacity: 0 }
                : { opacity: 0, scale: 0.8, y: 20 }
            }
            animate={
              isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              isMobile
                ? { y: "100%", opacity: 0 }
                : { opacity: 0, scale: 0.8, y: 20 }
            }
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={
              isMobile
                ? "fixed inset-0 z-50 pt-10 bg-black/20 backdrop-blur-sm"
                : "origin-bottom-right"
            }
          >
            {/* Mobile Overlay Click to Close */}
            {isMobile && (
              <div className="absolute inset-0" onClick={toggleOpen} />
            )}

            <Card
              className={`
                            ${
                              isMobile
                                ? "w-full h-full rounded-t-2xl border-b-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)]"
                                : "w-[380px] h-[600px] rounded-2xl shadow-2xl border-border/50"
                            }
                            flex flex-col bg-background relative overflow-hidden
                        `}
            >
              {/* Header */}
              <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-muted/40">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Task Assistant
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Powered by Framework AI
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={handleClear}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear Chat</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-muted"
                    onClick={toggleOpen}
                  >
                    {isMobile ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
                  <div className="py-6 space-y-6">
                    <AnimatePresence mode="popLayout">
                      {messages.length === 0 && <EmptyState />}
                      {messages.map((msg, index) => (
                        <ChatMessage
                          key={index}
                          message={msg}
                          onApplySuggestions={onApplySuggestions}
                        />
                      ))}
                      {isLoading && <LoadingBubble />}
                    </AnimatePresence>
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 bg-background border-t">
                  <div className="relative flex items-end gap-2 bg-muted/50 p-1.5 rounded-3xl border focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary/50 transition-all">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Describe your situation..."
                      className="min-h-[44px] max-h-[120px] w-full resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none px-4 py-3 placeholder:text-muted-foreground/70"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="h-9 w-9 rounded-full shrink-0 mb-0.5 mr-0.5 transition-all active:scale-95"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    AI can make mistakes. Review suggestions before applying.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        onClick={toggleOpen}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
                    h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-colors z-50
                    ${
                      isOpen
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground"
                    }
                `}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-7 w-7" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <Bot className="h-7 w-7" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

// --- Subcomponents ---

const EmptyState = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="text-center space-y-4 px-2"
  >
    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto rotate-3">
      <Sparkles className="h-8 w-8 text-primary" />
    </div>
    <div className="space-y-1">
      <h3 className="font-semibold text-lg">How can I help?</h3>
      <p className="text-sm text-muted-foreground">
        Describe a work situation, and I'll help you format it into Learning
        Points (SBIA).
      </p>
    </div>
  </motion.div>
));

EmptyState.displayName = "EmptyState";

const ChatMessage = forwardRef<
  HTMLDivElement,
  {
    message: Message;
    onApplySuggestions: (suggestions: Partial<Suggestions>) => void;
  }
>(({ message, onApplySuggestions }, ref) => {
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex items-start gap-3 ${isAssistant ? "" : "justify-end"}`}
    >
      {isAssistant && (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={`
                relative p-4 rounded-2xl max-w-[85%] text-sm shadow-sm
                ${
                  isAssistant
                    ? "bg-background border rounded-tl-none"
                    : "bg-primary text-primary-foreground rounded-tr-none"
                }
            `}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.suggestions && (
          <SuggestionsCard
            suggestions={message.suggestions}
            onApplySuggestions={onApplySuggestions}
          />
        )}
      </div>
      {!isAssistant && (
        <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center mt-1">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
});
ChatMessage.displayName = "ChatMessage";

const SuggestionsCard = ({
  suggestions,
  onApplySuggestions,
}: {
  suggestions: Suggestions;
  onApplySuggestions: (suggestions: Partial<Suggestions>) => void;
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback(
    (field: keyof Suggestions, value: string | undefined) => {
      if (!value) return;
      navigator.clipboard.writeText(value);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    },
    []
  );

  const suggestionItems = [
    {
      key: "situation" as const,
      label: "Situation",
      value: suggestions.situation,
    },
    {
      key: "behavior" as const,
      label: "Behavior",
      value: suggestions.behavior,
    },
    { key: "impact" as const, label: "Impact", value: suggestions.impact },
    ...(suggestions.action_item
      ? [
          {
            key: "action_item" as const,
            label: "Action Item",
            value: suggestions.action_item,
          },
        ]
      : []),
  ];

  return (
    <div className="mt-4 bg-muted/50 p-1 rounded-xl border overflow-hidden">
      <div className="px-3 py-2 border-b flex justify-between items-center bg-background/50">
        <div className="flex items-center gap-2">
          <Wand2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-xs">Structured Output</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-5">
          {suggestions.framework_category}
        </Badge>
      </div>

      <div className="p-3 space-y-4">
        {suggestionItems.map((item) => (
          <div key={item.key} className="relative group">
            <div className="flex justify-between items-start mb-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {item.label}
              </label>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleCopy(item.key, item.value)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded-md cursor-pointer"
                    >
                      {copied === item.key ? (
                        <ClipboardCheck className="h-3 w-3 text-green-500" />
                      ) : (
                        <Clipboard className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">Copy text</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs leading-relaxed text-foreground/90">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="p-2 bg-background/50 border-t flex gap-2">
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onApplySuggestions(suggestions)}
        >
          Apply All
        </Button>
      </div>
    </div>
  );
};

const LoadingBubble = React.forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3"
    >
      <div className="h-8 w-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="p-4 rounded-2xl bg-background border rounded-tl-none shadow-sm flex items-center gap-1.5 h-[54px]">
        <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce"></div>
      </div>
    </motion.div>
  );
});
LoadingBubble.displayName = "LoadingBubble";
