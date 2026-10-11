// src/components/build-project/BOQFeedbackModal.tsx
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { boqActivityApi } from "@/lib/api-boq-activity";
import { cn } from "@/lib/utils";

interface Props {
  boqId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const IMPROVE_OPTIONS = [
  { id: "missing_items", en: "Missing items", ar: "بنود ناقصة" },
  { id: "wrong_qty", en: "Wrong quantities", ar: "كميات غير دقيقة" },
  { id: "wrong_product", en: "Wrong matched products", ar: "منتجات غير مناسبة" },
  { id: "pricing", en: "Prices seem off", ar: "الأسعار غير دقيقة" },
  { id: "categories", en: "Missing categories", ar: "فئات ناقصة" },
];

const StarRow = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div>
    <div className="text-sm font-light text-[#061b31] mb-2">{label}</div>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 rounded hover:bg-[#f8fafd] transition"
          aria-label={`${n} stars`}
        >
          <Star
            className={cn(
              "w-6 h-6 transition",
              n <= value ? "fill-[#533afd] text-[#533afd]" : "text-[#d8d6df]",
            )}
          />
        </button>
      ))}
    </div>
  </div>
);

const BOQFeedbackModal = ({ boqId, open, onOpenChange }: Props) => {
  const { isRTL } = useLanguage();
  const [accuracy, setAccuracy] = useState(0);
  const [pricing, setPricing] = useState(0);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setImprovements((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async () => {
    if (accuracy === 0 && pricing === 0 && !comment.trim() && improvements.length === 0) {
      toast.info(isRTL ? "الرجاء إضافة تقييم" : "Please add a rating");
      return;
    }
    setBusy(true);
    await boqActivityApi.log({
      boqId,
      event: "feedback",
      feedback: {
        accuracyRating: accuracy || undefined,
        pricingRating: pricing || undefined,
        improvements,
        comment: comment.trim() || undefined,
      },
    });
    setBusy(false);
    toast.success(isRTL ? "شكرًا على ملاحظاتك!" : "Thanks for your feedback!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="font-light text-[#061b31]">
            {isRTL ? "كيف كانت قائمة الكميات؟" : "How was your BOQ?"}
          </DialogTitle>
          <DialogDescription className="font-light">
            {isRTL
              ? "ملاحظاتك تساعدنا على تحسين الدقة."
              : "Your feedback helps us improve accuracy."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <StarRow
            value={accuracy}
            onChange={setAccuracy}
            label={isRTL ? "دقة التقدير" : "Estimation accuracy"}
          />
          <StarRow
            value={pricing}
            onChange={setPricing}
            label={isRTL ? "دقة الأسعار" : "Pricing accuracy"}
          />
          <div>
            <div className="text-sm font-light text-[#061b31] mb-2">
              {isRTL ? "ما الذي يمكن تحسينه؟" : "What can we improve?"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {IMPROVE_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm text-[#50617a] font-light cursor-pointer">
                  <Checkbox
                    checked={improvements.includes(opt.id)}
                    onCheckedChange={() => toggle(opt.id)}
                  />
                  {isRTL ? opt.ar : opt.en}
                </label>
              ))}
            </div>
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 1000))}
            placeholder={isRTL ? "اكتب ملاحظاتك (اختياري)" : "Additional notes (optional)"}
            className="rounded-[4px] font-light"
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-[4px]">
              {isRTL ? "لاحقًا" : "Later"}
            </Button>
            <Button
              onClick={submit}
              disabled={busy}
              className="bg-[#533afd] hover:bg-[#422bc7] text-white rounded-[4px]"
            >
              {busy ? "…" : isRTL ? "إرسال" : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BOQFeedbackModal;
