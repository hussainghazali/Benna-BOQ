// src/components/build-project/ProjectWizardStep3.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Wand2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TIER_OPTIONS = [
  { id: "economy", labelEn: "Economy", labelAr: "اقتصادي", emoji: "💰" },
  { id: "standard", labelEn: "Standard", labelAr: "قياسي", emoji: "🏗️" },
  { id: "premium", labelEn: "Premium", labelAr: "بريميوم", emoji: "✨" },
  { id: "luxury", labelEn: "Luxury", labelAr: "فاخر", emoji: "👑" },
];

const SPEC_OPTIONS = [
  { id: "smart_home", labelEn: "Smart Home Systems", labelAr: "أنظمة المنزل الذكي", emoji: "🏠" },
  { id: "solar_panels", labelEn: "Solar Panels", labelAr: "ألواح شمسية", emoji: "☀️" },
  { id: "pool", labelEn: "Swimming Pool", labelAr: "مسبح", emoji: "🏊" },
  { id: "central_ac", labelEn: "Central A/C", labelAr: "تكييف مركزي", emoji: "❄️" },
  { id: "elevator", labelEn: "Elevator", labelAr: "مصعد", emoji: "🛗" },
  { id: "garden_landscaping", labelEn: "Garden / Landscaping", labelAr: "حديقة وتنسيق", emoji: "🌿" },
  { id: "security_system", labelEn: "Security / CCTV", labelAr: "نظام أمني", emoji: "🔒" },
  { id: "basement", labelEn: "Basement", labelAr: "قبو", emoji: "🕳️" },
  { id: "external_cladding_facade", labelEn: "External Cladding / Facade", labelAr: "واجهة/كسوة خارجية", emoji: "🧱" },
  { id: "wooden_interior", labelEn: "Wooden Interior Finishing", labelAr: "تشطيبات خشبية داخلية", emoji: "🪵" },
  { id: "false_ceiling_gypsum", labelEn: "False Ceiling / Gypsum", labelAr: "أسقف جبس معلقة", emoji: "🏛️" },
  { id: "marble_flooring", labelEn: "Marble Flooring", labelAr: "أرضيات رخام", emoji: "◽" },
  { id: "double_glazing", labelEn: "Double-Glazed Windows", labelAr: "نوافذ مزدوجة العزل", emoji: "🪟" },
  { id: "thermal_insulation", labelEn: "Thermal Insulation", labelAr: "عزل حراري", emoji: "🌡️" },
  { id: "water_tank", labelEn: "Water Tank System", labelAr: "خزانات مياه", emoji: "💧" },
  { id: "backup_generator", labelEn: "Backup Generator", labelAr: "مولد احتياطي", emoji: "⚡" },
  { id: "fire_safety", labelEn: "Fire Safety System", labelAr: "أنظمة إطفاء الحريق", emoji: "🧯" },
  { id: "garage", labelEn: "Enclosed Garage", labelAr: "كراج مغلق", emoji: "🚗" },
];

interface Props {
  specifications: Record<string, boolean>;
  setSpecifications: (v: Record<string, boolean>) => void;
  additionalNotes: string;
  setAdditionalNotes: (v: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
}

const ProjectWizardStep3 = ({
  specifications,
  setSpecifications,
  additionalNotes,
  setAdditionalNotes,
  onGenerate,
  onBack,
  isGenerating,
}: Props) => {
  const { isRTL } = useLanguage();

  const toggleSpec = (id: string) => {
    setSpecifications({ ...specifications, [id]: !specifications[id] });
  };

  const selectedCount = Object.values(specifications).filter(Boolean).length;

  const handleGenerate = () => {
    if (isGenerating) return;
    onGenerate();
  };

  const isProcessing = isGenerating;

  const selectedTier =
    TIER_OPTIONS.find((t) => specifications[t.id])?.id || "standard";

  const setTier = (id: string) => {
    const next = { ...specifications };
    TIER_OPTIONS.forEach((t) => {
      next[t.id] = false;
    });
    next[id] = true;
    setSpecifications(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Conversational header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[4px] bg-[#e5edf5] flex items-center justify-center shrink-0">
          <Wand2 className="w-5 h-5 text-[#FA6400]" />
        </div>
        <div className="bg-[#f8fafd] rounded-[4px] rounded-tl-sm px-4 py-3 border border-[#d8d6df]">
          <p className="text-sm text-[#061b31] font-light">
            {isRTL
              ? "أخيرًا! 🎯 اختر مستوى التشطيب والمواصفات الإضافية — سأحسب كل شيء بدقة."
              : "Almost there! 🎯 Pick a finishing tier and any extra specs — I'll calculate everything precisely."}
          </p>
        </div>
      </div>

      {/* Finishing Tier */}
      <div>
        <Label className="text-sm font-light mb-3 block text-[#061b31]">
          {isRTL ? "مستوى التشطيب" : "Finishing Tier"}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIER_OPTIONS.map((t) => {
            const active = selectedTier === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.id)}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-2.5 rounded-[4px] border text-sm font-light transition-all",
                  active
                    ? "border-[#FA6400] bg-[#e5edf5] text-[#061b31] shadow-sm"
                    : "border-[#d8d6df] bg-white text-[#50617a] hover:border-[#FA6400]",
                )}
              >
                <span>{t.emoji}</span>
                <span>{isRTL ? t.labelAr : t.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Specifications Grid */}
      <div>
        <Label className="text-sm font-light mb-3 block text-[#061b31]">
          {isRTL ? "المواصفات الإضافية" : "Additional Specifications"}
          {selectedCount > 0 && (
            <span className="ml-2 text-xs font-light bg-[#FA6400] text-white px-2 py-0.5 rounded-[4px]">
              {selectedCount} {isRTL ? "محدد" : "selected"}
            </span>
          )}
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {SPEC_OPTIONS.map((spec, i) => (
            <motion.label
              key={spec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02, duration: 0.25 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-[4px] border cursor-pointer transition-all duration-300",
                specifications[spec.id]
                  ? "border-[#FA6400] bg-[#e5edf5] shadow-sm"
                  : "border-[#d8d6df] hover:border-[#FA6400] bg-white",
              )}
            >
              <Checkbox
                checked={specifications[spec.id] || false}
                onCheckedChange={() => toggleSpec(spec.id)}
                className="border-[#d8d6df] data-[state=checked]:bg-[#FA6400] data-[state=checked]:border-[#FA6400] data-[state=checked]:text-white"
              />
              <span className="text-base">{spec.emoji}</span>
              <span
                className={cn(
                  "text-sm font-light",
                  specifications[spec.id] ? "text-[#061b31]" : "text-[#50617a]",
                )}
              >
                {isRTL ? spec.labelAr : spec.labelEn}
              </span>
            </motion.label>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Label className="text-sm font-light mb-2 block text-[#061b31]">
          {isRTL ? "ملاحظات إضافية" : "Additional Notes"}
        </Label>
        <Textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value.slice(0, 2000))}
          placeholder={
            isRTL ? "أي متطلبات خاصة..." : "Any special requirements..."
          }
          className="min-h-[80px] bg-white border border-[#d8d6df] focus:border-[#FA6400] focus:ring-[#FA6400]/10 rounded-[4px] transition-all resize-none font-light"
          maxLength={2000}
        />
        <p className="text-xs text-[#64748d] mt-1 text-right font-light">
          {additionalNotes.length}/2000
        </p>
      </motion.div>

      {/* What you'll get card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-[#f8fafd] rounded-[4px] p-4 border border-[#d8d6df]"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-light text-[#64748d] uppercase tracking-wider">
            {isRTL ? "ستحصل على" : "You'll get"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-[#50617a]">
          {[
            isRTL ? "📋 قائمة كميات مفصلة" : "📋 Detailed material list",
            isRTL ? "💰 تقديرات أسعار دقيقة" : "💰 Accurate price estimates",
            isRTL ? "🏷️ علامات تجارية موصى بها" : "🏷️ Recommended brands",
            isRTL ? "📊 تصدير CSV" : "📊 CSV export ready",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 py-1">
              <span className="text-[#FA6400]">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Navigation Buttons */}
      <div className={cn("flex gap-3", isRTL && "flex-row-reverse")}>
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 gap-2 border border-[#d8d6df] hover:border-[#FA6400] hover:bg-[#f8fafd] text-[#061b31] font-light rounded-[4px] transition-all"
          disabled={isProcessing}
        >
          {isRTL ? (
            <ArrowRight className="w-4 h-4" />
          ) : (
            <ArrowLeft className="w-4 h-4" />
          )}
          {isRTL ? "السابق" : "Back"}
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="flex-1 h-14 text-base font-light gap-2 bg-[#FA6400] hover:bg-[#E85A00] text-white rounded-[4px] shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isRTL ? "جاري المعالجة..." : "Processing..."}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {isRTL
                ? "توليد قائمة كميات قابلة للشراء"
                : "Generate shoppable BOQ"}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default ProjectWizardStep3;
