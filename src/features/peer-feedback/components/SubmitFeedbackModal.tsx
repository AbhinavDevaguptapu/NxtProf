import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUserAuth } from "@/context/UserAuthContext";
import { Employee } from "../types";
import RatingInput from "./RatingInput";
import { useState } from "react";
import { usePeerFeedbackLock } from "../hooks/usePeerFeedbackLock";
import {
  getUserFriendlyErrorMessage,
  formatErrorForDisplay,
} from "@/lib/errorHandler";

const functions = getFunctions();
const givePeerFeedback = httpsCallable(
  functions,
  "peerFeedback-givePeerFeedback"
);

const validateRemarks = (value: string) => {
  // Trim and collapse spaces for validation
  const processed = value.trim().replace(/\s+/g, " ");
  return processed.length >= 10;
};

const formSchema = z.object({
  projectOrTask: z
    .string()
    .min(3, "Project or task must be at least 3 characters."),
  workEfficiency: z.string().min(1, "You must select a rating."),
  easeOfWork: z.string().min(1, "You must select a rating."),
  remarks: z
    .string()
    .refine(
      validateRemarks,
      "Remarks must be at least 10 characters long and cannot consist mostly of spaces."
    )
    .max(2000),
});

interface SubmitFeedbackModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetEmployee: Employee;
  onFeedbackSubmitted: () => void;
}

const SubmitFeedbackModal = ({
  isOpen,
  onOpenChange,
  targetEmployee,
  onFeedbackSubmitted,
}: SubmitFeedbackModalProps) => {
  const { user } = useUserAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLocked } = usePeerFeedbackLock();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectOrTask: "",
      remarks: "",
      workEfficiency: "",
      easeOfWork: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error("Please log in to submit feedback.");
      return;
    }
    setIsSubmitting(true);

    // Process remarks: trim and collapse spaces
    const processedRemarks = values.remarks.trim().replace(/\s+/g, " ");

    const payload = {
      ...values,
      remarks: processedRemarks,
      giverId: user.uid,
      targetId: targetEmployee.id,
      workEfficiency: parseInt(values.workEfficiency, 10),
      easeOfWork: parseInt(values.easeOfWork, 10),
    };

    try {
      await toast.promise(givePeerFeedback(payload), {
        loading: "Submitting your feedback...",
        success: () => {
          onFeedbackSubmitted();
          return "Feedback submitted successfully! Thank you for your input.";
        },
        error: (err) => {
          const message = getUserFriendlyErrorMessage(
            err,
            "Unable to submit your feedback. Please try again."
          );
          return message;
        },
      });
    } catch (error) {
      console.error("Submission failed:", error);
      const { description } = formatErrorForDisplay(
        error,
        "Submission Failed",
        "submitting"
      );
      toast.error(description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Give Feedback to {targetEmployee.name}
          </DialogTitle>
          <DialogDescription>
            Your feedback will be submitted anonymously. Please be constructive
            and respectful.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="projectOrTask"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task or Work</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Peer Feedback" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <RatingInput
                control={form.control}
                name="workEfficiency"
                label="Work Efficiency"
              />
              <RatingInput
                control={form.control}
                name="easeOfWork"
                label="Ease of Collaboration"
              />
            </div>
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide your anonymous feedback here..."
                      rows={4}
                      value={field.value}
                      onChange={(e) => {
                        const newValue = e.target.value.replace(/\s+/g, " ");
                        field.onChange(newValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLocked}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Anonymously"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitFeedbackModal;
