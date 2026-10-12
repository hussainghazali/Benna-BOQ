// src/components/build-project/AIGeneratingOverlay.tsx
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Package,
  CheckCircle2,
  Zap,
  FileText,
  Database,
} from "lucide-react";

const STEPS_EN = [
  { icon: FileText, text: "Reading project requirements..." },
  { icon: Calculator, text: "Calculating material quantities..." },
  { icon: Package, text: "Matching Benna products..." },
  { icon: Database, text: "Preparing your BOQ table..." },
  { icon: CheckCircle2, text: "Finalizing cart-ready results..." },
];

const STEPS_AR = [
  { icon: FileText, text: "قراءة متطلبات المشروع..." },
  { icon: Calculator, text: "حساب كميات المواد..." },
  { icon: Package, text: "مطابقة منتجات بنّة..." },
  { icon: Database, text: "تجهيز جدول قائمة الكميات..." },
  { icon: CheckCircle2, text: "إنهاء النتائج الجاهزة للسلة..." },
];

const AIGeneratingOverlay = () => {
  const { isRTL } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const steps = isRTL ? STEPS_AR : STEPS_EN;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-[6px] border border-[#d8d6df] bg-white overflow-hidden"
      style={{ boxShadow: "rgba(23,23,23,0.08) 0px 15px 35px 0px" }}
      role="status"
      aria-live="polite"
      aria-label={isRTL ? "جاري توليد قائمة الكميات" : "Generating BOQ"}
    >
      {/* Sunburst gradient top strip */}
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, rgb(114,50,241) 3.13%, rgb(251,118,250) 50%, rgb(255,207,94))" }}
      />

      <div className="p-8 flex flex-col items-center gap-6">
        {/* Circular SVG spinner */}
        <div className="relative w-20 h-20">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e5edf5" strokeWidth="6" />
            <motion.circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="#FF6600"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="213"
              animate={{ strokeDashoffset: [213, 40, 213] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-7 h-7 text-[#FF6600] animate-pulse" />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <h3 style={{ fontSize: "22px", fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.01px" }} className="text-[#061b31]">
            {isRTL
              ? "بنّة تجهز قائمة كميات مشروعك"
              : "Benna is preparing your BOQ"}
          </h3>
          <p className="text-[14px] text-[#50617a] font-light">
            {isRTL
              ? "نطابق المواد مع كتالوج بنّة المباشر"
              : "Matching your materials with the live Benna catalog"}
          </p>
        </div>

        {/* Steps progress */}
        <div className="w-full max-w-sm space-y-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: i <= currentStep ? 1 : 0.35, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.35 }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-[4px] border transition-all duration-500 ${
                  isActive
                    ? "bg-[#f8fafd] border-[#FF6600]"
                    : isDone
                      ? "bg-white border-[#d8d6df]"
                      : "bg-white border-[#e5edf5]"
                }`}
              >
                {/* Left violet accent */}
                {isActive && (
                  <div className="absolute left-0 w-0.5 h-full bg-[#FF6600] rounded-r-full" />
                )}
                <div
                  className={`w-7 h-7 rounded-[4px] flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? "bg-[#FF6600] text-white"
                      : isActive
                        ? "bg-[#e5edf5] text-[#FF6600]"
                        : "bg-[#f8fafd] text-[#64748d]"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "animate-pulse" : ""}`} />
                  )}
                </div>
                <span
                  className={`text-[13px] font-light transition-colors flex-1 ${
                    isActive ? "text-[#061b31]" : isDone ? "text-[#50617a]" : "text-[#64748d]"
                  }`}
                >
                  {step.text}
                </span>
                {isActive && (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-[#FF6600] shrink-0"
                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e5edf5] border border-[#d8d6df] rounded-[4px] text-[11px] font-light text-[#FF6600]">
            <Zap className="w-3 h-3" />
            {isRTL ? "مطابقة كتالوج" : "Catalog matched"}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8fafd] border border-[#d8d6df] rounded-[4px] text-[11px] font-light text-[#50617a]">
            <Calculator className="w-3 h-3 text-[#FF6600]" />
            {isRTL ? "حاسبة مجانية" : "Free calculator"}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default AIGeneratingOverlay;
