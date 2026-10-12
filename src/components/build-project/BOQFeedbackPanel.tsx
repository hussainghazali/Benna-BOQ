// src/components/build-project/BOQFeedbackPanel.tsx
import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  PackageX,
  RefreshCw,
  Send,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { boqApi } from "@/lib/api-boq";
import { getCurrentUserId } from "@/lib/auth-session";

interface Props {
  boqItemId: string;
  category: string;
  item: string;
  originalQuantity: number;
  originalUnitPrice: number;
  projectName?: string;
  projectType?: string;
  city?: string;
  areaSqm?: number;
  floors?: number;
  projectId?: string;
  onFeedbackSubmitted?: () => void;
}

const BOQFeedbackPanel = ({
  boqItemId,
  category,
  item,
  originalQuantity,
  originalUnitPrice,
  projectName,
  projectType,
  city,
  areaSqm,
  floors,
  projectId,
  onFeedbackSubmitted,
}: Props) => {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<
    "helpful" | "inaccurate" | "missing" | "replaced" | "removed" | null
  >(null);
  const [accuracyScore, setAccuracyScore] = useState(5);
  const [relevanceScore, setRelevanceScore] = useState(5);
  const [suggestedImprovement, setSuggestedImprovement] = useState("");
  const [replacementItem, setReplacementItem] = useState("");
  const [replacementReason, setReplacementReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate stable ID if synthetic
  const stableItemId =
    boqItemId || `boq-${category}-${item}`.replace(/\s+/g, "-").slice(0, 100);

  const resetForm = useCallback(() => {
    setFeedbackType(null);
    setAccuracyScore(5);
    setRelevanceScore(5);
    setSuggestedImprovement("");
    setReplacementItem("");
    setReplacementReason("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!feedbackType) {
      toast.error(
        isRTL ? "يرجى اختيار نوع الملاحظات" : "Please select a feedback type",
      );
      return;
    }

    const customerId = getCurrentUserId();
    if (!customerId) {
      toast.error(isRTL ? "يرجى تسجيل الدخول" : "Please log in");
      return;
    }

    setIsSubmitting(true);

    try {
      await boqApi.submitFeedback({
        customerId,
        projectId,
        projectName,
        projectType,
        city,
        areaSqm,
        floors,
        boqItemId: stableItemId,
        category,
        item,
        originalQuantity,
        originalUnitPrice,
        feedbackType,
        accuracyScore,
        relevanceScore,
        suggestedImprovement: suggestedImprovement.trim(),
        replacementItem:
          feedbackType === "replaced" ? replacementItem.trim() : undefined,
        replacementReason:
          feedbackType === "replaced" ? replacementReason.trim() : undefined,
      });

      toast.success(
        isRTL ? "تم إرسال ملاحظاتك بنجاح" : "Feedback submitted successfully",
      );
      setOpen(false);
      onFeedbackSubmitted?.();
      resetForm();
    } catch (error: any) {
      console.error("Feedback submission error:", error);
      const msg =
        error?.data?.message ||
        (isRTL ? "فشل إرسال الملاحظات" : "Failed to submit feedback");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    feedbackType,
    projectId,
    projectName,
    projectType,
    city,
    areaSqm,
    floors,
    stableItemId,
    category,
    item,
    originalQuantity,
    originalUnitPrice,
    accuracyScore,
    relevanceScore,
    suggestedImprovement,
    replacementItem,
    replacementReason,
    isRTL,
    onFeedbackSubmitted,
    resetForm,
  ]);

  const feedbackOptions = [
    {
      type: "helpful" as const,
      label: "Helpful",
      labelAr: "مفيد",
      icon: ThumbsUp,
      color:
        "bg-[#e5edf5] text-[#FA6400] hover:bg-[#d8d6df] border border-[#d8d6df]",
    },
    {
      type: "inaccurate" as const,
      label: "Inaccurate",
      labelAr: "غير دقيق",
      icon: ThumbsDown,
      color:
        "bg-[#f8fafd] text-[#50617a] hover:bg-[#e5edf5] border border-[#d8d6df]",
    },
    {
      type: "missing" as const,
      label: "Missing Product",
      labelAr: "منتج مفقود",
      icon: AlertTriangle,
      color:
        "bg-[#f8fafd] text-[#50617a] hover:bg-[#e5edf5] border border-[#d8d6df]",
    },
    {
      type: "replaced" as const,
      label: "Replaced",
      labelAr: "تم الاستبدال",
      icon: RefreshCw,
      color:
        "bg-[#f8fafd] text-[#50617a] hover:bg-[#e5edf5] border border-[#d8d6df]",
    },
    {
      type: "removed" as const,
      label: "Not Needed",
      labelAr: "غير مطلوب",
      icon: PackageX,
      color:
        "bg-[#f8fafd] text-[#50617a] hover:bg-[#e5edf5] border border-[#d8d6df]",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs">
          {isRTL ? "ملاحظات" : "Feedback"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border border-[#d8d6df] rounded-[4px]">
        <DialogHeader>
          <DialogTitle className="font-light text-[#061b31]">
            {isRTL ? "ملاحظات على العنصر" : "Item Feedback"}
          </DialogTitle>
          <DialogDescription className="text-[#50617a] font-light">
            {isRTL
              ? "ساعدنا في تحسين دقة التوصيات"
              : "Help us improve our recommendations"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item info */}
          <div className="p-3 bg-[#f8fafd] rounded-[4px] border border-[#d8d6df]">
            <p className="font-light text-sm text-[#061b31]">{item}</p>
            <p className="text-xs text-[#64748d] font-light">{category}</p>
          </div>

          {/* Feedback type selection */}
          <div className="space-y-2">
            <Label className="font-light text-[#061b31]">
              {isRTL ? "نوع الملاحظة" : "Feedback Type"}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {feedbackOptions.map((option) => (
                <Button
                  key={option.type}
                  type="button"
                  variant={feedbackType === option.type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackType(option.type)}
                  className={
                    feedbackType !== option.type
                      ? option.color
                      : "bg-[#FA6400] hover:bg-[#E85A00] text-white rounded-[4px] font-light"
                  }
                >
                  <option.icon className="w-4 h-4 mr-2" />
                  {isRTL ? option.labelAr : option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Accuracy score */}
          <div className="space-y-2">
            <Label className="font-light text-[#061b31]">
              {isRTL ? "الدقة" : "Accuracy"}: {accuracyScore}/5
            </Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[accuracyScore]}
                onValueChange={(v) => setAccuracyScore(v[0])}
                min={1}
                max={5}
                step={1}
                className="flex-1"
              />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= accuracyScore
                        ? "fill-[#FA6400] text-[#FA6400]"
                        : "text-[#64748d]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Relevance score */}
          <div className="space-y-2">
            <Label className="font-light text-[#061b31]">
              {isRTL ? "الصلة" : "Relevance"}: {relevanceScore}/5
            </Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[relevanceScore]}
                onValueChange={(v) => setRelevanceScore(v[0])}
                min={1}
                max={5}
                step={1}
                className="flex-1"
              />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= relevanceScore
                        ? "fill-[#FA6400] text-[#FA6400]"
                        : "text-[#64748d]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Suggested improvement */}
          <div className="space-y-2">
            <Label className="font-light text-[#061b31]">
              {isRTL ? "اقتراح للتحسين" : "Suggested Improvement"}
            </Label>
            <Textarea
              placeholder={
                isRTL ? "ما الذي يمكن تحسينه؟" : "What can be improved?"
              }
              value={suggestedImprovement}
              onChange={(e) => setSuggestedImprovement(e.target.value)}
              rows={2}
              maxLength={5000}
              className="border border-[#d8d6df] focus:border-[#FA6400] focus:ring-[#FA6400]/10 rounded-[4px] font-light resize-none"
            />
          </div>

          {/* Replacement info (if replaced) */}
          {feedbackType === "replaced" && (
            <>
              <div className="space-y-2">
                <Label className="font-light text-[#061b31]">
                  {isRTL ? "المنتج البديل" : "Replacement Product"}
                </Label>
                <Textarea
                  placeholder={
                    isRTL ? "اسم المنتج الذي استخدمته" : "Product name you used"
                  }
                  value={replacementItem}
                  onChange={(e) => setReplacementItem(e.target.value)}
                  rows={1}
                  maxLength={500}
                  className="border border-[#d8d6df] focus:border-[#FA6400] focus:ring-[#FA6400]/10 rounded-[4px] font-light resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-light text-[#061b31]">
                  {isRTL ? "سبب الاستبدال" : "Reason for Replacement"}
                </Label>
                <Textarea
                  placeholder={
                    isRTL
                      ? "لماذا استبدلت هذا المنتج؟"
                      : "Why did you replace this product?"
                  }
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  className="border border-[#d8d6df] focus:border-[#FA6400] focus:ring-[#FA6400]/10 rounded-[4px] font-light resize-none"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            className="border border-[#d8d6df] hover:border-[#FA6400] hover:bg-[#f8fafd] text-[#061b31] font-light rounded-[4px]"
          >
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#FA6400] hover:bg-[#E85A00] text-white rounded-[4px] font-light"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                {isRTL ? "جاري الإرسال..." : "Submitting..."}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {isRTL ? "إرسال" : "Submit"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BOQFeedbackPanel;
