import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Timestamp } from "firebase/firestore";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  FilePlus,
  Lock,
  Unlock,
  Trash2,
  Pencil,
  Eye,
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  ArrowRight,
  Info,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { LearningPoint } from "../types";
import { LearningPointFormFields } from "./LearningPointFormFields";
import { analyzeTask } from "@/features/task-analyzer/services/geminiService";
import { TaskData, AnalysisResult } from "@/features/task-analyzer/types";
import { AIAssistant } from "./AIAssistant";
import { Suggestions } from "../services/learningPointsAIService";
import { getUserFriendlyErrorMessage } from "@/lib/errorHandler";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";

// --- FORM SCHEMA ---
const formSchema = z
  .object({
    date: z.date().optional(),
    task_name: z
      .string()
      .min(5, { message: "Task name must be at least 5 characters." }),
    framework_category: z
      .string()
      .min(1, { message: "Please select a category." }),
    point_type: z.enum(["R1", "R2", "R3"]).optional(),
    subcategory: z.string().optional(),
    task_link: z.string().optional(),
    recipient: z.string().min(3, { message: "Recipient is required." }),
    situation: z
      .string()
      .min(10, { message: "Situation must be at least 10 characters." }),
    behavior: z
      .string()
      .min(10, { message: "Behavior must be at least 10 characters." }),
    impact: z
      .string()
      .min(10, { message: "Impact must be at least 10 characters." }),
    action_item: z.string().optional(),
  })
  .refine((data) => data.date, {
    message: "A date is required.",
    path: ["date"],
  })
  .refine((data) => data.point_type, {
    message: "You must select a point type.",
    path: ["point_type"],
  })
  .refine(
    (data) => {
      if (
        data.point_type === "R1" &&
        (!data.action_item || data.action_item.length < 10)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Action item must be at least 10 characters for R1.",
      path: ["action_item"],
    }
  );

// --- COMPONENT PROPS ---
type LearningPointsListProps = {
  points: LearningPoint[];
  isLoading: boolean;
  onAddPoint: (data: any) => void;
  onUpdatePoint: (id: string, data: any) => void;
  onDeletePoint: (id: string) => void;
  isDayLocked: boolean;
};

// --- INLINE FORM COMPONENT ---
const InlineLearningPointForm = ({
  onFormSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: {
  onFormSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  isEditing?: boolean;
}) => {
  const [analysisScore, setAnalysisScore] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisRationale, setAnalysisRationale] = useState<string | null>(
    null
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullAnalysisResult, setFullAnalysisResult] =
    useState<AnalysisResult | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      date: new Date(),
      task_name: "",
      framework_category: "",
      point_type: undefined,
      subcategory: "",
      task_link: "",
      recipient: "",
      situation: "",
      behavior: "",
      impact: "",
      action_item: "",
    },
  });

  const pointType = form.watch("point_type");

  useEffect(() => {
    if (pointType === "R1") {
      form.setValue("recipient", "Self");
    } else {
      if (form.getValues("recipient") === "Self") {
        form.setValue("recipient", "");
      }
    }
  }, [pointType, form]);

  const handleAnalysis = async () => {
    // Validate required fields before analysis
    const currentPoint = form.getValues();

    if (!currentPoint.task_name || currentPoint.task_name.trim().length < 5) {
      form.setError("task_name", {
        message: "Task name is required (minimum 5 characters)",
      });
      return;
    }

    if (!currentPoint.framework_category) {
      form.setError("framework_category", {
        message: "Task Framework Category is required",
      });
      return;
    }

    if (!currentPoint.point_type) {
      form.setError("point_type", { message: "Point Type is required" });
      return;
    }

    if (!currentPoint.situation || currentPoint.situation.trim().length < 10) {
      form.setError("situation", {
        message: "Situation is required (minimum 10 characters)",
      });
      return;
    }

    if (!currentPoint.behavior || currentPoint.behavior.trim().length < 10) {
      form.setError("behavior", {
        message: "Behavior is required (minimum 10 characters)",
      });
      return;
    }

    if (!currentPoint.impact || currentPoint.impact.trim().length < 10) {
      form.setError("impact", {
        message: "Impact is required (minimum 10 characters)",
      });
      return;
    }

    if (!currentPoint.recipient || currentPoint.recipient.trim().length < 3) {
      form.setError("recipient", {
        message: "Recipient is required (minimum 3 characters)",
      });
      return;
    }

    // Check action_item for R1 points only
    if (
      currentPoint.point_type === "R1" &&
      (!currentPoint.action_item || currentPoint.action_item.trim().length < 10)
    ) {
      form.setError("action_item", {
        message:
          "Action Item is required for R1 points (minimum 10 characters)",
      });
      return;
    }

    // If validation passes, clear any existing errors
    const fieldNames: (keyof typeof currentPoint)[] = [
      "task_name",
      "framework_category",
      "point_type",
      "subcategory",
      "task_link",
      "recipient",
      "situation",
      "behavior",
      "impact",
      "action_item",
    ];
    fieldNames.forEach((field) => {
      form.clearErrors(field);
    });

    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setAnalysisRationale(null);
    setAnalysisError(null);

    try {
      const taskData: TaskData = {
        id: "new-point",
        date: new Date().toISOString().split("T")[0],
        task: currentPoint.task_name,
        taskFrameworkCategory: currentPoint.framework_category,
        situation: currentPoint.situation,
        behavior: currentPoint.behavior,
        impact: currentPoint.impact,
        action: currentPoint.action_item || "",
        recipient: currentPoint.recipient,
        pointType: currentPoint.point_type,
      };

      const result = await analyzeTask(taskData);

      setAnalysisScore(result.matchPercentage);
      setAnalysisRationale(result.rationale);
      setFullAnalysisResult(result);
      setAnalysisComplete(true);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Analysis failed:", error);
      const friendlyMessage = getUserFriendlyErrorMessage(
        error,
        "The AI analysis encountered an issue. Please try again or check your connection."
      );
      setAnalysisError(friendlyMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    const submissionData = {
      ...data,
      date: Timestamp.fromDate(data.date || new Date()),
    };
    onFormSubmit(submissionData);
    form.reset();
  };

  const handleApplyAISuggestions = (suggestions: Partial<Suggestions>) => {
    if (suggestions.situation)
      form.setValue("situation", suggestions.situation, {
        shouldValidate: true,
      });
    if (suggestions.behavior)
      form.setValue("behavior", suggestions.behavior, { shouldValidate: true });
    if (suggestions.impact)
      form.setValue("impact", suggestions.impact, { shouldValidate: true });
    if (suggestions.action_item)
      form.setValue("action_item", suggestions.action_item, {
        shouldValidate: true,
      });
    if (suggestions.framework_category)
      form.setValue("framework_category", suggestions.framework_category, {
        shouldValidate: true,
      });
  };

  const isR3Point = form.watch("point_type") === "R3";
  const isSubmitDisabled =
    !isR3Point &&
    (!analysisComplete || (analysisScore !== null && analysisScore < 75));

  // Check if all required fields are filled for analysis
  const currentPoint = form.watch();
  const isFormValidForAnalysis =
    currentPoint.task_name &&
    currentPoint.task_name.trim().length >= 5 &&
    currentPoint.framework_category &&
    currentPoint.point_type &&
    currentPoint.situation &&
    currentPoint.situation.trim().length >= 10 &&
    currentPoint.behavior &&
    currentPoint.behavior.trim().length >= 10 &&
    currentPoint.impact &&
    currentPoint.impact.trim().length >= 10 &&
    currentPoint.recipient &&
    currentPoint.recipient.trim().length >= 3 &&
    (currentPoint.point_type !== "R1" ||
      (currentPoint.action_item &&
        currentPoint.action_item.trim().length >= 10));

  const analysisDisabled = isAnalyzing || isR3Point || !isFormValidForAnalysis;

  useEffect(() => {
    const subscription = form.watch(() => {
      setAnalysisComplete(false);
      setAnalysisScore(null);
      setAnalysisRationale(null);
      setFullAnalysisResult(null);
      setAnalysisError(null);
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Calculate hasCorrections outside useEffect
  const hasCorrections =
    fullAnalysisResult &&
    (fullAnalysisResult.correctedRecipient ||
      fullAnalysisResult.correctedSituation ||
      fullAnalysisResult.correctedBehavior ||
      fullAnalysisResult.correctedImpact ||
      fullAnalysisResult.correctedActionItem);

  const handleApplySuggestions = () => {
    if (!fullAnalysisResult) return;

    // Update form fields with corrected values
    if (fullAnalysisResult.correctedRecipient) {
      form.setValue("recipient", fullAnalysisResult.correctedRecipient, {
        shouldValidate: true,
      });
    }
    if (fullAnalysisResult.correctedSituation) {
      form.setValue("situation", fullAnalysisResult.correctedSituation, {
        shouldValidate: true,
      });
    }
    if (fullAnalysisResult.correctedBehavior) {
      form.setValue("behavior", fullAnalysisResult.correctedBehavior, {
        shouldValidate: true,
      });
    }
    if (fullAnalysisResult.correctedImpact) {
      form.setValue("impact", fullAnalysisResult.correctedImpact, {
        shouldValidate: true,
      });
    }
    if (fullAnalysisResult.correctedActionItem) {
      form.setValue("action_item", fullAnalysisResult.correctedActionItem, {
        shouldValidate: true,
      });
    }

    // Close modals. The form.watch effect will reset the analysis state.
    setIsConfirmDialogOpen(false);
    setIsModalOpen(false);
  };

  return (
    <FormProvider {...form}>
      <Card className="relative overflow-hidden border-border/50 shadow-md">
        {/* Decorative top border */}

        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="p-6 space-y-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FilePlus className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold">
              {isEditing ? "Edit Learning Point" : "New Learning Point"}
            </h3>
          </div>

          <LearningPointFormFields />

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            {!isR3Point && (
              <Button
                type="button"
                onClick={handleAnalysis}
                disabled={analysisDisabled}
                variant="secondary"
                className="w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Analyze & Verify
                  </>
                )}
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full sm:w-auto min-w-[120px]"
            >
              Submit
            </Button>
          </div>
        </form>

        {!isEditing && (
          <AIAssistant onApplySuggestions={handleApplyAISuggestions} />
        )}
      </Card>

      <AlertDialog
        open={!!analysisError}
        onOpenChange={() => setAnalysisError(null)}
      >
        <AlertDialogContent>
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle>Analysis Failed</AlertDialogTitle>
              <AlertDialogDescription>{analysisError}</AlertDialogDescription>
            </div>
          </div>

          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              onClick={() => setAnalysisError(null)}
              className="min-w-[120px]"
            >
              Okay, got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
          <div className="p-6 pb-2 border-b bg-muted/20">
            <div className="flex items-center gap-3 mb-1">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  analysisScore !== null && analysisScore >= 75
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {analysisScore !== null && analysisScore >= 75 ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl">Analysis Result</DialogTitle>
                <DialogDescription>
                  Based on task framework best practices.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {analysisScore !== null && (
                <div className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm">
                  <span className="font-semibold text-muted-foreground">
                    Quality Score
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "text-3xl font-bold",
                        analysisScore >= 75 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {analysisScore.toFixed(0)}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      /100
                    </span>
                  </div>
                </div>
              )}

              {analysisRationale && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> Analysis Rationale
                  </h4>
                  <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                    {analysisRationale}
                  </p>
                </div>
              )}

              {/* Display corrections if available */}
              {fullAnalysisResult &&
                fullAnalysisResult.status === "Needs improvement" &&
                (fullAnalysisResult.correctedRecipient ||
                  fullAnalysisResult.correctedSituation ||
                  fullAnalysisResult.correctedBehavior ||
                  fullAnalysisResult.correctedImpact ||
                  fullAnalysisResult.correctedActionItem) && (
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 text-amber-600">
                      <Sparkles className="h-4 w-4" /> Suggested Improvements
                    </h4>
                    <div className="grid gap-4">
                      {fullAnalysisResult.correctedRecipient && (
                        <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                          <strong className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                            Recipient
                          </strong>
                          <p className="text-sm">
                            {fullAnalysisResult.correctedRecipient}
                          </p>
                        </div>
                      )}

                      {/* Similar blocks for other corrected fields... simplified for brevity but functionality remains */}
                      {[
                        {
                          label: "Situation",
                          val: fullAnalysisResult.correctedSituation,
                        },
                        {
                          label: "Behavior",
                          val: fullAnalysisResult.correctedBehavior,
                        },
                        {
                          label: "Impact",
                          val: fullAnalysisResult.correctedImpact,
                        },
                        {
                          label: "Action Item",
                          val: fullAnalysisResult.correctedActionItem,
                        },
                      ].map(
                        (field) =>
                          field.val && (
                            <div
                              key={field.label}
                              className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg"
                            >
                              <strong className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                                {field.label}
                              </strong>
                              <p className="text-sm">{field.val}</p>
                            </div>
                          )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row gap-3 justify-end items-center">
            {analysisScore !== null && analysisScore < 75 && (
              <p className="text-xs text-red-600 font-medium mr-auto">
                Score &lt; 75%: Action required to submit.
              </p>
            )}

            {/* Replace Suggestions Button */}
            {fullAnalysisResult &&
              fullAnalysisResult.status === "Needs improvement" &&
              hasCorrections && (
                <Button
                  onClick={() => setIsConfirmDialogOpen(true)}
                  className="w-full sm:w-auto"
                  variant="default"
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Accept Improvements
                </Button>
              )}

            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogContent className="sm:max-w-[450px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace with AI Suggestions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite your current entries with the AI-improved
              versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApplySuggestions}>
              Apply Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
};

// --- MAIN COMPONENT ---
export const LearningPointsList = ({
  points,
  isLoading,
  onAddPoint,
  onUpdatePoint,
  onDeletePoint,
  isDayLocked,
}: LearningPointsListProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingFormOpen, setIsEditingFormOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<LearningPoint | undefined>(
    undefined
  );
  const [viewingPoint, setViewingPoint] = useState<LearningPoint | null>(null);
  const [deleteConfirmPoint, setDeleteConfirmPoint] =
    useState<LearningPoint | null>(null);

  const handleOpenFormForEdit = (point: LearningPoint) => {
    setEditingPoint(point);
    setIsEditingFormOpen(true);
  };

  const handleAddFormSubmit = (data: any) => {
    onAddPoint(data);
    setIsFormOpen(false);
  };

  const handleEditFormSubmit = (data: any) => {
    if (editingPoint) {
      onUpdatePoint(editingPoint.id, data);
    }
    setIsEditingFormOpen(false);
  };

  const handleDeleteClick = (point: LearningPoint) => {
    setDeleteConfirmPoint(point);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmPoint) {
      onDeletePoint(deleteConfirmPoint.id);
      setDeleteConfirmPoint(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            My Learning Points
          </h2>
          <p className="text-muted-foreground mt-1">
            Reflect on your daily tasks using the{" "}
            <a
              href="https://d2rj3iig8nko29.cloudfront.net/website-static/task-framework.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Task Framework
            </a>
            .
          </p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={() => setIsFormOpen(true)}
            disabled={isDayLocked}
            size="lg"
            className="shadow-md transition-transform hover:scale-[1.02]"
          >
            <FilePlus className="mr-2 h-5 w-5" />
            Add Learning Point
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <InlineLearningPointForm
              onFormSubmit={handleAddFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isDayLocked && (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200"
        >
          <Lock className="h-4 w-4" />
          <AlertTitle>Session Locked</AlertTitle>
          <AlertDescription>
            This session has been closed by an admin. Points can no longer be
            added or edited.
          </AlertDescription>
        </Alert>
      )}

      {points.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {points.map((point) => {
              const isEditable = point.editable && !isDayLocked;
              return (
                <motion.div
                  key={point.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Card
                    className={cn(
                      "flex flex-col h-full transition-all duration-200 hover:shadow-md",
                      !isEditable
                        ? "bg-muted/30 opacity-90"
                        : "bg-card border-border/60"
                    )}
                  >
                    <CardHeader className="pb-3 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono text-[10px] uppercase tracking-wider",
                                point.point_type === "R1"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : point.point_type === "R2"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              )}
                            >
                              {point.point_type}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[10px] truncate max-w-[150px]"
                            >
                              {point.framework_category}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                            {point.task_name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditable ? (
                            <div className="flex bg-muted rounded-md p-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-background shadow-none"
                                onClick={() => handleOpenFormForEdit(point)}
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-background  hover:text-red-500 shadow-none"
                                onClick={() => handleDeleteClick(point)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Lock className="h-4 w-4 text-muted-foreground/50" />
                                </TooltipTrigger>
                                <TooltipContent>Locked</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3 text-sm text-muted-foreground line-clamp-3">
                      <p className="line-clamp-3">{point.situation}</p>
                    </CardContent>

                    <CardFooter className="mt-auto pt-3 border-t bg-muted/10 flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" /> {point.recipient}
                        </span>
                        <span>•</span>
                        <span>
                          {point.createdAt
                            ? format(point.createdAt.toDate(), "MMM d, h:mm a")
                            : ""}
                        </span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-primary font-semibold"
                        onClick={() => setViewingPoint(point)}
                      >
                        View Details <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        !isFormOpen && (
          <div className="text-center py-20 px-4 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5">
            <div className="mx-auto bg-muted rounded-full overflow-hidden w-16 h-16 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No learning points yet
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Start capturing your daily learnings by clicking the "Add Learning
              Point" button above.
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              disabled={isDayLocked}
              variant="outline"
            >
              Start Writing
            </Button>
          </div>
        )
      )}

      {/* EDIT MODAL */}
      <Dialog open={isEditingFormOpen} onOpenChange={setIsEditingFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6">
            <InlineLearningPointForm
              isEditing={true}
              initialData={
                editingPoint
                  ? {
                      ...editingPoint,
                      date:
                        editingPoint.date &&
                        typeof editingPoint.date.toDate === "function"
                          ? editingPoint.date.toDate()
                          : editingPoint.date || new Date(),
                    }
                  : undefined
              }
              onFormSubmit={handleEditFormSubmit}
              onCancel={() => setIsEditingFormOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS MODAL */}
      {viewingPoint && (
        <Dialog
          open={!!viewingPoint}
          onOpenChange={(open) => !open && setViewingPoint(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{viewingPoint.point_type}</Badge>
                <Badge>{viewingPoint.framework_category}</Badge>
              </div>
              <DialogTitle className="text-xl">
                {viewingPoint.task_name}
              </DialogTitle>
              <DialogDescription>
                Created on{" "}
                {viewingPoint.createdAt
                  ? format(viewingPoint.createdAt.toDate(), "PPP p")
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-6 text-sm">
                <section className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                    Situation
                  </h4>
                  <p className="leading-relaxed">{viewingPoint.situation}</p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                    Behavior
                  </h4>
                  <p className="leading-relaxed">{viewingPoint.behavior}</p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                    Impact
                  </h4>
                  <p className="leading-relaxed">{viewingPoint.impact}</p>
                </section>
                {viewingPoint.action_item && (
                  <section className="space-y-2">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                      Action Item
                    </h4>
                    <p className="leading-relaxed">
                      {viewingPoint.action_item}
                    </p>
                  </section>
                )}
                <div className="bg-muted p-3 rounded-lg flex items-center gap-2 text-xs">
                  <span className="font-semibold">Recipient:</span>{" "}
                  {viewingPoint.recipient}
                  {viewingPoint.task_link && (
                    <>
                      <span className="mx-2 text-muted-foreground/50">|</span>
                      <a
                        href={viewingPoint.task_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Task Link
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmPoint}
        onOpenChange={(open) => !open && setDeleteConfirmPoint(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Learning Point?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {deleteConfirmPoint?.task_name}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteConfirm}
            >
              Delete Point
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
