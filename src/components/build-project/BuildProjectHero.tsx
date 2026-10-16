// src/components/build-project/BuildProjectHero.tsx
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  LogIn,
  Brain,
  Calculator,
  FileText,
  ArrowRight,
  Zap,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BuildProjectHero = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      label: isRTL ? "تحليل ذكي" : "Smart Analysis",
      desc: isRTL
        ? "يحلل متطلبات مشروعك بدقة عالية"
        : "AI analyzes your project requirements",
      stat: isRTL ? "دقة ٩٥٪" : "95% Accuracy",
    },
    {
      icon: Calculator,
      label: isRTL ? "تسعير لحظي" : "Real-time Pricing",
      desc: isRTL
        ? "أسعار محدثة من السوق السعودي"
        : "Live pricing from the Saudi market",
      stat: isRTL ? "١٦٥+ مدينة" : "165+ Cities",
    },
    {
      icon: FileText,
      label: isRTL ? "تقرير شامل" : "Full BOQ Report",
      desc: isRTL
        ? "قائمة كميات مفصلة جاهزة للتصدير"
        : "Detailed BOQ ready to export",
      stat: isRTL ? "تصدير فوري" : "Instant Export",
    },
  ];

  return (
    <div className="w-full">
      {/* ── Sunburst hero band ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(90deg, rgb(255,115,0) 3.13%, rgb(255,102,0) 50%, rgb(255,61,0))",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(circle at 20% 50%, rgb(127,125,252) 0%, transparent 55%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full blur-3xl opacity-30"
          style={{ background: "rgb(255,46,222)" }}
        />

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-white/30 mb-6">
              <Zap className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-normal text-white tracking-wide">
                {isRTL ? "مدعوم بالذكاء الاصطناعي · Benna Build Engine" : "Powered by AI · Benna Build Engine"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>

            <h1
              className="text-white mb-4"
              style={{
                fontSize: "clamp(40px, 7vw, 72px)",
                fontWeight: 500,
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
              }}
            >
              {isRTL ? (
                <>ابنِ مشروعك<br />بالذكاء الاصطناعي</>
              ) : (
                <>Build your<br />project with AI</>
              )}
            </h1>
            <p
              className="text-white/80 max-w-lg mx-auto mb-8"
              style={{ fontSize: "18px", fontWeight: 500, lineHeight: 1.4 }}
            >
              {isRTL
                ? "أدخل تفاصيل مشروعك واحصل على قائمة كميات كاملة مع تكاليف تقديرية دقيقة في ثوانٍ"
                : "Enter your project details and receive a complete Bill of Quantities with accurate cost estimates in seconds"}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Button
                onClick={() => navigate("/welcome")}
                className="h-12 px-8 rounded-lg bg-white text-[#FF6600] font-normal hover:bg-[#f7f7f7] transition-all shadow-sm"
                style={{ fontSize: "15px" }}
              >
                {isRTL ? "ابدأ مجاناً" : "Start for free"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button
                onClick={() => navigate("/register")}
                className="text-sm font-normal text-white/80 hover:text-white transition-colors underline underline-offset-4"
              >
                {isRTL ? "سجّل حساباً جديداً →" : "Create a free account →"}
              </button>
            </div>

            {/* Stat pills */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { v: "95%", l: isRTL ? "دقة" : "Accuracy" },
                { v: "165+", l: isRTL ? "مدينة" : "Cities" },
                { v: "30s", l: isRTL ? "نتائج" : "Results" },
                { v: "Free", l: isRTL ? "أول توليد" : "First BOQ" },
              ].map((s) => (
                <div key={s.v} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-lg px-3 py-1.5">
                  <span className="text-white font-normal text-sm">{s.v}</span>
                  <span className="text-white/65 text-xs font-normal">{s.l}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Feature cards strip ── */}
      <div className="bg-[#f7f7f7] border-b border-[#e5e5e5]">
        <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="group bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#FF6600] transition-all duration-300"
                  style={{ boxShadow: "rgba(23,23,23,0.04) 0px 2px 4px 0px" }}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center mb-3 group-hover:bg-[#FF6600] transition-colors duration-300">
                    <Icon className="w-5 h-5 text-[#FF6600] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <p className="text-[14px] font-normal text-[#222222] mb-1">{f.label}</p>
                  <p className="text-[12px] text-[#666666] mb-3 leading-relaxed font-normal">{f.desc}</p>
                  <div className="flex items-baseline gap-1.5 pt-3 border-t border-[#f0f0f0]">
                    <span className="text-[#FF6600] text-[15px] font-normal">{f.stat}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-6 mt-8 text-[11px] text-[#888888] font-normal"
          >
            {[
              { icon: Shield, text: isRTL ? "🔒 آمن ومشفر" : "Secure & Encrypted" },
              { icon: null, text: isRTL ? "⚡ نتائج في ٣٠ ثانية" : "Results in 30s" },
              { icon: null, text: isRTL ? "📊 تصدير CSV" : "CSV Export" },
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                {item.icon && <item.icon className="w-3 h-3 text-[#FF6600]" />}
                {item.text}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BuildProjectHero;
