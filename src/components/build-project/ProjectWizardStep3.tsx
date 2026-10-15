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
  { id: "majlis", labelEn: "Majlis / Diwaniya", labelAr: "مجلس / ديوانية", emoji: "🛋️" },
  { id: "maid_room", labelEn: "Maid's Room", labelAr: "غرفة خادمة", emoji: "🛏️" },
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
        <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center shrink-0">
          <Wand2 className="w-5 h-5 text-[#FF6600]" />
        </div>
        <div className="bg-[#f7f7f7] rounded-lg rounded-tl-sm px-4 py-3 border border-[#e5e5e5]">
          <p className="text-sm text-[#222222] font-normal">
            {isRTL
              ? "أخيرًا! 🎯 اختر مستوى التشطيب والمواصفات الإضافية — سأحسب كل شيء بدقة."
              : "Almost there! 🎯 Pick a finishing tier and any extra specs — I'll calculate everything precisely."}
          </p>
        </div>
      </div>

      {/* Finishing Tier */}
      <div>
        <Label className="text-sm font-normal mb-3 block text-[#222222]">
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
                  "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-normal transition-all",
                  active
                    ? "border-[#FF6600] bg-[#f0f0f0] text-[#222222] shadow-sm"
                    : "border-[#e5e5e5] bg-white text-[#666666] hover:border-[#FF6600]",
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
        <Label className="text-sm font-normal mb-3 block text-[#222222]">
          {isRTL ? "المواصفات الإضافية" : "Additional Specifications"}
          {selectedCount > 0 && (
            <span className="ml-2 text-xs font-normal bg-[#FF6600] text-white px-2 py-0.5 rounded-lg">
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
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-300",
                specifications[spec.id]
                  ? "border-[#FF6600] bg-[#f0f0f0] shadow-sm"
                  : "border-[#e5e5e5] hover:border-[#FF6600] bg-white",
              )}
            >
              <Checkbox
                checked={specifications[spec.id] || false}
                onCheckedChange={() => toggleSpec(spec.id)}
                className="border-[#e5e5e5] data-[state=checked]:bg-[#FF6600] data-[state=checked]:border-[#FF6600] data-[state=checked]:text-white"
              />
              <span className="text-base">{spec.emoji}</span>
              <span
                className={cn(
                  "text-sm font-normal",
                  specifications[spec.id] ? "text-[#222222]" : "text-[#666666]",
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
        <Label className="text-sm font-normal mb-2 block text-[#222222]">
          {isRTL ? "ملاحظات إضافية" : "Additional Notes"}
        </Label>
        <Textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value.slice(0, 2000))}
          placeholder={
            isRTL ? "أي متطلبات خاصة..." : "Any special requirements..."
          }
          className="min-h-[80px] bg-white border border-[#e5e5e5] focus:border-[#FF6600] focus:ring-[#FF6600]/10 rounded-lg transition-all resize-none font-normal"
          maxLength={2000}
        />
        <p className="text-xs text-[#888888] mt-1 text-right font-normal">
          {additionalNotes.length}/2000
        </p>
      </motion.div>

      {/* Navigation Buttons */}
      <div className={cn("flex gap-3", isRTL && "flex-row-reverse")}>
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 gap-2 border border-[#e5e5e5] hover:border-[#FF6600] hover:bg-[#f7f7f7] text-[#222222] font-normal rounded-lg transition-all"
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
          className="flex-1 h-14 text-base font-normal gap-2 bg-[#FF6600] hover:bg-[#FF6600] text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
