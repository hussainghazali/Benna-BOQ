// src/components/build-project/ProjectWizardStep1.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
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
        <div className="w-10 h-10 rounded-[4px] bg-[#e5edf5] flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-[#FF6600]" />
        </div>
        <div className="bg-[#f8fafd] rounded-[4px] rounded-tl-sm px-4 py-3 border border-[#d8d6df]">
          <p className="text-sm text-[#061b31] font-light">
            {isRTL
              ? "مرحبًا! 👋 أخبرني عن مشروعك — اسمه ونوعه، وسأجهز لك قائمة كميات كاملة."
              : "Hey there! 👋 Tell me about your project — its name and type, and I'll prepare a complete BOQ for you."}
          </p>
        </div>
      </div>

      {/* Project Name Input */}
      <div>
        <Label className="text-sm font-light mb-2 block text-[#061b31]">
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
          className="h-12 bg-white border border-[#d8d6df] focus:border-[#FF6600] focus:ring-[#FF6600]/10 transition-all rounded-[4px] font-light"
        />
        <p className="text-xs text-[#64748d] mt-1 text-right font-light">
          {projectName.length}/200
        </p>
      </div>

      {/* Project Type Grid */}
      <div>
        <Label className="text-sm font-light mb-3 block text-[#061b31]">
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
                  "relative flex flex-col items-center gap-2 p-4 rounded-[4px] border transition-all duration-300 overflow-hidden group",
                  isSelected
                    ? "border-[#FF6600] bg-[#e5edf5] shadow-sm"
                    : "border-[#d8d6df] hover:border-[#FF6600] bg-white",
                )}
                type="button"
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-[#FF6600]/5" />
                )}
                <div
                  className={cn(
                    "w-10 h-10 rounded-[4px] flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-[#FF6600] text-white"
                      : "bg-[#f8fafd] group-hover:bg-[#e5edf5] text-[#64748d] group-hover:text-[#FF6600]",
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    "text-sm font-light relative z-10",
                    isSelected ? "text-[#061b31]" : "text-[#50617a]",
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
          className="w-full h-12 text-base font-light gap-2 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-[4px] shadow-sm hover:shadow-md transition-all duration-300"
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
