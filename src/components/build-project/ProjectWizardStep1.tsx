// src/components/build-project/ProjectWizardStep1.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building,
  Building2,
  Home,
  Warehouse,
  Factory,
  Paintbrush,
  Trees,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const PROJECT_TYPES = [
  { value: "villa", labelEn: "Villa", labelAr: "فيلا", icon: Home },
  {
    value: "apartment",
    labelEn: "Apartment Building",
    labelAr: "عمارة سكنية",
    icon: Building2,
  },
  {
    value: "commercial",
    labelEn: "Commercial",
    labelAr: "تجاري",
    icon: Factory,
  },
  {
    value: "warehouse",
    labelEn: "Warehouse",
    labelAr: "مستودع",
    icon: Warehouse,
  },
  {
    value: "renovation",
    labelEn: "Renovation",
    labelAr: "تجديد",
    icon: Paintbrush,
  },
  {
    value: "landscape",
    labelEn: "Landscaping",
    labelAr: "تنسيق حدائق",
    icon: Trees,
  },
  {
    value: "tower",
    labelEn: "Tower / High-rise",
    labelAr: "برج",
    icon: Building,
  },
  { value: "other", labelEn: "Other", labelAr: "أخرى", icon: HelpCircle },
];

interface Props {
  projectName: string;
  setProjectName: (v: string) => void;
  projectType: string;
  setProjectType: (v: string) => void;
  onNext: () => void;
}

const ProjectWizardStep1 = ({
  projectName,
  setProjectName,
  projectType,
  setProjectType,
  onNext,
}: Props) => {
  const { isRTL } = useLanguage();

  const isValid = projectName.trim().length >= 2 && projectType.length > 0;

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
          <Sparkles className="w-5 h-5 text-[#FF6600]" />
        </div>
        <div className="bg-[#f7f7f7] rounded-lg rounded-tl-sm px-4 py-3 border border-[#e5e5e5]">
          <p className="text-sm text-[#222222] font-normal">
            {isRTL
              ? "مرحبًا! 👋 أخبرني عن مشروعك — اسمه ونوعه، وسأجهز لك قائمة كميات كاملة."
              : "Hey there! 👋 Tell me about your project — its name and type, and I'll prepare a complete BOQ for you."}
          </p>
        </div>
      </div>

      {/* Project Name Input */}
      <div>
        <Label className="text-sm font-normal mb-2 block text-[#222222]">
          {isRTL ? "اسم المشروع" : "Project Name"}
        </Label>
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value.slice(0, 200))}
          placeholder={
            isRTL
              ? "مثال: فيلا سكنية في جدة"
              : "e.g., Residential Villa in Jeddah"
          }
          maxLength={200}
          className="h-12 bg-white border border-[#e5e5e5] focus:border-[#FF6600] focus:ring-[#FF6600]/10 transition-all rounded-lg font-normal"
        />
        <p className="text-xs text-[#888888] mt-1 text-right font-normal">
          {projectName.length}/200
        </p>
      </div>

      {/* Project Type Grid */}
      <div>
        <Label className="text-sm font-normal mb-3 block text-[#222222]">
          {isRTL ? "نوع المشروع" : "Project Type"}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PROJECT_TYPES.map((type, i) => {
            const Icon = type.icon;
            const isSelected = projectType === type.value;
            return (
              <motion.button
                key={type.value}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setProjectType(type.value)}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-300 overflow-hidden group",
                  isSelected
                    ? "border-[#FF6600] bg-[#f0f0f0] shadow-sm"
                    : "border-[#e5e5e5] hover:border-[#FF6600] bg-white",
                )}
                type="button"
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-[#FF6600]/5" />
                )}
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-[#FF6600] text-white"
                      : "bg-[#f7f7f7] group-hover:bg-[#f0f0f0] text-[#888888] group-hover:text-[#FF6600]",
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    "text-sm font-normal relative z-10",
                    isSelected ? "text-[#222222]" : "text-[#666666]",
                  )}
                >
                  {isRTL ? type.labelAr : type.labelEn}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Next Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isValid ? 1 : 0.5 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="w-full h-12 text-base font-normal gap-2 bg-[#FF6600] hover:bg-[#FF6600] text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
        >
          {isRTL ? (
            <>
              <ArrowLeft className="w-4 h-4" />
              التالي
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default ProjectWizardStep1;
