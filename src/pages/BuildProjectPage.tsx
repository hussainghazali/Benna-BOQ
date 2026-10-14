// src/pages/BuildProjectPage.tsx
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeo, getBOQServiceSchema, getSpeakableSchema } from "@/lib/seo";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useBOQGeneration } from "@/hooks/useBOQGeneration";
import { useVendorChat } from "@/hooks/useVendorChat";
import { MAX_AREA_SQM, MAX_FLOORS } from "@/lib/boq-engine";

import { trackEvent } from "@/lib/tracking";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
const ChatManager = lazy(() => import("@/components/ChatManager"));
import ProjectWizardStep1 from "@/components/build-project/ProjectWizardStep1";
import ProjectWizardStep2 from "@/components/build-project/ProjectWizardStep2";
import ProjectWizardStep3 from "@/components/build-project/ProjectWizardStep3";
import BOQResultTable from "@/components/build-project/BOQResultTable";
import BOQFeedbackModal from "@/components/build-project/BOQFeedbackModal";
import CreditPaywall from "@/components/build-project/CreditPaywall";
import CreditStatusBar from "@/components/build-project/CreditStatusBar";
import AIGeneratingOverlay from "@/components/build-project/AIGeneratingOverlay";
import { cn } from "@/lib/utils";
import {
  Ruler,
  Settings2,
  CheckCircle2,
  Zap,
  Shield,
  TrendingUp,
  FileText,
  ShoppingCart,
  BarChart3,
  Building2,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import BennaLoader from "@/components/BennaLoader";
import SideActionRail from "@/components/sections/SideActionRail";

const STEP_META = [
  { labelEn: "Project", labelAr: "المشروع", icon: Building2 },
  { labelEn: "Scale", labelAr: "الأبعاد", icon: Ruler },
  { labelEn: "Specs", labelAr: "المواصفات", icon: Settings2 },
];

const BuildProjectPage = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const { generate, isGenerating, result, setResult, reset } =
    useBOQGeneration();
  const {
    openChats,
    setOpenChats,
    activeChatId,
    setActiveChatId,
    showChat,
    setShowChat,
    openChat,
  } = useVendorChat();

  useSeo({
    title: "Build My Project - Free BOQ Builder for Construction",
    titleAr: "ابنِ مشروعك - حاسبة كميات البناء المجانية",
    description:
      "Get a free, shoppable Bill of Quantities (BOQ) for your construction project in Saudi Arabia. Match materials to Benna products and add them to cart.",
    descriptionAr:
      "احصل على قائمة كميات مجانية قابلة للشراء لمشروعك في السعودية. فلل، شقق، مباني تجارية، مستودعات، وتجديدات.",
    keywords:
      "BOQ generator, bill of quantities, construction calculator, building materials estimate, حاسبة كميات, تقدير مواد بناء, Saudi Arabia",
    schemas: [getBOQServiceSchema(), getSpeakableSchema("/build-project")],
  });

  const [step, setStep] = useState(1);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [city, setCity] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [floors, setFloors] = useState("");
  const [specifications, setSpecifications] = useState<Record<string, boolean>>(
    {},
  );
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Handle payment success from URL params
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      const creditsAdded = searchParams.get("credits");
      toast.success(
        creditsAdded
          ? `${creditsAdded} credits added to your account!`
          : "Payment successful! Credits added to your account.",
      );
      refetchCredits();
      setShowPaywall(false);

      // Clean URL params
      navigate("/build-project", { replace: true });
    }
  }, [searchParams, refetchCredits, navigate]);

  // Validate inputs before generating
  const validateInputs = useCallback((): string | null => {
    if (!projectName.trim() || projectName.trim().length < 2) {
      return isRTL
        ? "اسم المشروع مطلوب (٢ أحرف على الأقل)"
        : "Project name required (min 2 chars)";
    }
    if (!projectType) {
      return isRTL ? "نوع المشروع مطلوب" : "Project type required";
    }
    if (!city) {
      return isRTL ? "المدينة مطلوبة" : "City required";
    }
    const area = Number(areaSqm);
    if (!areaSqm || isNaN(area) || area < 1 || area > MAX_AREA_SQM) {
      return isRTL
        ? "المساحة يجب أن تكون بين ١ و١٠٠٠٠٠ م²"
        : "Area must be between 1 and 100,000 sqm";
    }
    const floorCount = Number(floors);
    if (!floors || isNaN(floorCount) || floorCount < 1 || floorCount > MAX_FLOORS) {
      return isRTL
        ? "عدد الأدوار يجب أن يكون بين ١ و٥٠"
        : "Floors must be between 1 and 50";
    }

    return null;
  }, [projectName, projectType, city, areaSqm, floors, isRTL]);

  const handleGenerate = useCallback(async () => {
    const validationError = validateInputs();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!isAuthenticated) {
      toast.info(
        isRTL
          ? "سجّل الدخول للحصول على ٥٠ قائمة كميات مجانية وحفظ مشروعك."
          : "Sign in to get 50 free BOQs and save your project.",
      );
      navigate("/login?redirect=/build-project");
      return;
    }

    // Proactively open paywall when balance is 0 and no unlimited plan.
    // Message must match reality: never bought a pack yet (totalPurchased===0)
    // means this was the free-50 running out; otherwise it's paid credits
    // running out. Same distinction the credit-status UI and the backend's
    // 402 response already use — keep all three in sync.
    if (
      credits &&
      !credits.isUnlimited &&
      (credits.balance ?? 0) <= 0
    ) {
      setShowPaywall(true);
      const stillOnFreeAllotment = (credits.totalPurchased ?? 0) === 0;
      toast.info(
        stillOnFreeAllotment
          ? isRTL
            ? "استخدمت قوائمك المجانية الخمسين. اختر باقة للمتابعة."
            : "Your 50 free BOQs are used. Pick a pack to continue."
          : isRTL
            ? "نفد رصيدك. اختر باقة للمتابعة."
            : "You're out of credits. Pick a pack to continue.",
      );
      return;
    }

    const selectedSpecs = Object.entries(specifications)
      .filter(([, v]) => v)
      .map(([k]) => k.toLowerCase());
    const has = (k: string) => selectedSpecs.some((s) => s.includes(k));
    const tierMatch = selectedSpecs.find((s) =>
      /economy|standard|premium|luxury/i.test(s),
    );
    const finishingTier = (tierMatch as any) || "standard";

    const res = await generate({
      projectName: projectName.trim(),
      projectType,
      city,
      areaSqm: Number(areaSqm),
      floors: Number(floors),
      finishingTier,
      hasBasement: has("basement"),
      features: {
        ac: has("ac") || has("air") || has("cooling"),
        elevator: has("elevator") || has("lift"),
        pool: has("pool") || has("swim"),
        solar: has("solar"),
        smartHome: has("smart"),
        landscaping: has("landscap") || has("garden"),
        externalCladding: has("cladding") || has("facade"),
        woodenInterior: has("wood"),
      },
    });

    if (res.ok) {
      try {
        trackEvent.submitBOQ(projectType || "unknown");
      } catch {
        /* non-critical */
      }
      if (isAuthenticated) refetchCredits();
      // Result shows inline; open feedback after a delay
      setTimeout(() => setShowFeedback(true), 4000);
    } else if (res.outOfCredits) {
      setShowPaywall(true);
    }
  }, [
    isAuthenticated,
    specifications,
    projectName,
    projectType,
    city,
    areaSqm,
    floors,
    generate,
    refetchCredits,
    validateInputs,
    navigate,
    isRTL,
    credits,
  ]);

  const handleReset = useCallback(() => {
    setStep(1);
    setProjectName("");
    setProjectType("");
    setCity("");
    setAreaSqm("");
    setFloors("");
    setSpecifications({});
    setAdditionalNotes("");
    reset(); // Use hook's reset
    setShowPaywall(false);
  }, [reset]);

  const WHAT_WE_BUILT = [
    {
      icon: Calculator,
      titleEn: "Simple Material Calculator",
      titleAr: "محرك مواد مبسط",
      descEn: "A clean rule-based BOQ calculator turns project area, floors, and specs into a practical materials list",
      descAr: "حاسبة كميات واضحة تحول المساحة والأدوار والمواصفات إلى قائمة مواد عملية",
      stat: "50",
      statLabelEn: "free BOQs",
      statLabelAr: "قائمة مجانية",
    },
    {
      icon: BarChart3,
      titleEn: "Live Saudi Market Pricing",
      titleAr: "أسعار السوق السعودي الحية",
      descEn: "Unit prices indexed to 165+ Saudi cities using live contractor & supplier benchmarks updated monthly",
      descAr: "أسعار الوحدة مؤشرة لأكثر من ١٦٥ مدينة سعودية باستخدام معايير حية للمقاولين والموردين",
      stat: "182k+",
      statLabelEn: "products",
      statLabelAr: "منتج",
    },
    {
      icon: ShoppingCart,
      titleEn: "One-Click Shoppable BOQ",
      titleAr: "قائمة كميات قابلة للشراء",
      descEn: "Every BOQ line item is matched to real Benna catalog products — add all materials to cart in one click",
      descAr: "كل بند في القائمة مطابق لمنتجات كتالوج Benna الفعلي — أضف كل المواد للسلة بنقرة واحدة",
      stat: "1-click",
      statLabelEn: "order everything",
      statLabelAr: "طلب كل شيء",
    },
    {
      icon: FileText,
      titleEn: "Instant Export",
      titleAr: "تصدير CSV فوري",
      descEn: "Export a full structured BOQ spreadsheet ready for contractors, consultants, or bank submissions",
      descAr: "تصدير جدول بيانات BOQ منظم جاهز للمقاولين أو الاستشاريين أو تقديم البنك",
      stat: "CSV",
      statLabelEn: "ready",
      statLabelAr: "جاهز",
    },
  ];

  const shellWrapper = (content: React.ReactNode) => (
    <div className="min-h-screen bg-white">
      <Header />
      {content}
      <Footer />
      {showChat && openChats.length > 0 && (
        <Suspense fallback={null}>
          <ChatManager
            openChats={openChats}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            setOpenChats={setOpenChats}
            setShowChat={setShowChat}
          />
        </Suspense>
      )}
    </div>
  );

  if (authLoading) {
    return shellWrapper(
      <div className="flex items-center justify-center py-32">
        <BennaLoader
          size="md"
          label={isRTL ? "جاري التحميل..." : "Loading..."}
        />
      </div>,
    );
  }

  return shellWrapper(
    <main className="w-full">
      {/* ── Hero Band — Alibaba-style, left-aligned, centered container ── */}
      <div className="relative overflow-hidden bg-ali-orange-100/60">
        <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 xl:px-8 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-[32px] sm:text-[42px] font-bold leading-tight tracking-tight text-ali-ink-900">
              {isRTL ? (
                <>بنّة رقم <span className="text-ali-orange-500">١ لبناء قوائم الكميات</span></>
              ) : (
                <>KSA's <span className="text-ali-orange-500">#1 BOQ builder</span></>
              )}
            </h1>
            <p className="mt-2 text-[15px] sm:text-base text-ali-ink-500">
              {isRTL
                ? "صِف مشروعك · احصل على قائمة كميات قابلة للشراء · أضف كل شيء للسلة"
                : "Describe your project · Get a shoppable BOQ · Add everything to cart"}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("boq-wizard")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ali-orange-500 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-ali-orange-600"
              >
                <FileText className="h-4 w-4" />
                {isRTL ? "أنشئ قائمتي" : "Generate my BOQ"}
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex h-11 items-center rounded-full border border-ali-ink-900 bg-white px-7 text-[15px] font-semibold text-ali-ink-900 transition-colors hover:bg-ali-bg-100"
              >
                {isRTL ? "كيف يعمل" : "How it works"}
              </button>
              <Link
                to="/boq-projects"
                className="text-[15px] font-medium text-ali-ink-900 hover:text-ali-orange-500"
              >
                {isRTL ? "مشاريعي" : "View my projects"}
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="border-t border-ali-ink-900/10 bg-white/40">
          <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-center sm:justify-between gap-x-8 gap-y-2 px-4 lg:px-6 xl:px-8 py-4">
            {[
              { v: "50", l: isRTL ? "قائمة مجانية" : "FREE BOQS" },
              { v: "184K+", l: isRTL ? "منتج في الكتالوج" : "PRODUCTS IN CATALOG" },
              { v: "1,085+", l: isRTL ? "فئة مغطاة" : "CATEGORIES COVERED" },
              { v: "+165", l: isRTL ? "مدينة سعودية" : "SAUDI CITIES PRICED" },
              { v: "1-click", l: isRTL ? "أضف الكل للسلة" : "ADD ALL TO CART" },
            ].map((s) => (
              <div key={s.l} className="flex items-baseline gap-2">
                <span className="text-[20px] font-bold text-ali-ink-900">{s.v}</span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-ali-ink-500">
                  {s.l}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Wizard / Result Area ── */}
      <div className="bg-white" id="boq-wizard">
        <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 xl:px-8 py-10">
          <div className={cn(result ? "w-full" : "max-w-3xl xl:max-w-5xl 2xl:max-w-6xl mx-auto") }>
            {showPaywall ? (
              <CreditPaywall
                onPurchaseComplete={() => {
                  refetchCredits();
                  setShowPaywall(false);
                }}
              />
            ) : isGenerating ? (
              <AIGeneratingOverlay />
            ) : result ? (
              <>
                <BOQResultTable
                  result={result}
                  onReset={handleReset}
                  onOpenFeedback={() => setShowFeedback(true)}
                  onOpenChat={openChat}
                />
                <BOQFeedbackModal
                  boqId={result.boqId}
                  open={showFeedback}
                  onOpenChange={setShowFeedback}
                />
              </>
            ) : (
              <>
                {/* Section label */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-5 h-0.5 bg-[#FA6400] rounded-full" />
                    <span className="text-xs font-light text-[#FA6400] uppercase tracking-widest">
                      {isRTL ? "ابدأ الآن" : "Get started"}
                    </span>
                    <div className="w-5 h-0.5 bg-[#FA6400] rounded-full" />
                  </div>
                  <p className="text-[14px] font-light text-[#50617a]">
                    {isRTL ? "٣ خطوات فقط للحصول على قائمة كمياتك" : "Just 3 steps to your complete BOQ"}
                  </p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-0 mb-8">
                  {STEP_META.map((s, i) => {
                    const stepNum = i + 1;
                    const Icon = s.icon;
                    const isActive = step === stepNum;
                    const isDone = step > stepNum;
                    return (
                      <div key={stepNum} className="flex items-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={cn(
                              "w-11 h-11 rounded-[4px] flex items-center justify-center transition-all duration-500 border",
                              isDone
                                ? "bg-[#FA6400] border-[#FA6400] text-white"
                                : isActive
                                  ? "bg-white border-[#FA6400] text-[#061b31]"
                                  : "bg-[#f8fafd] border-[#d8d6df] text-[#64748d]",
                            )}
                            style={isActive ? { boxShadow: "rgba(83,58,253,0.15) 0px 0px 0px 3px" } : {}}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-[11px] font-light transition-colors",
                              isDone
                                ? "text-[#FA6400]"
                                : isActive
                                  ? "text-[#061b31]"
                                  : "text-[#64748d]",
                            )}
                          >
                            {isRTL ? s.labelAr : s.labelEn}
                          </span>
                        </div>
                        {stepNum < 3 && (
                          <div
                            className={cn(
                              "w-16 sm:w-24 h-[2px] rounded mx-2 mb-5 transition-all duration-500",
                              step > stepNum
                                ? "bg-[#FA6400]"
                                : step === stepNum
                                  ? "bg-[#d8d6df]"
                                  : "bg-[#e5edf5]",
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Credit status — visible across all 3 wizard steps, not just after generating */}
                <div className="mb-4">
                  <CreditStatusBar onBuyCredits={() => setShowPaywall(true)} />
                </div>

                {/* Wizard Card */}
                <div
                  className="relative bg-white rounded-[6px] border border-[#d8d6df] overflow-hidden"
                  style={{ boxShadow: "rgba(23,23,23,0.08) 0px 15px 35px 0px" }}
                >
                  {/* Violet top accent bar */}
                  <div
                    className="h-1 w-full"
                    style={{ background: "linear-gradient(90deg, rgb(114,50,241) 3.13%, rgb(251,118,250) 50%, rgb(255,207,94))" }}
                  />
                  <div className="p-6 sm:p-8">
                    <AnimatePresence mode="wait">
                      {step === 1 && (
                        <ProjectWizardStep1
                          key="step1"
                          projectName={projectName}
                          setProjectName={setProjectName}
                          projectType={projectType}
                          setProjectType={setProjectType}
                          onNext={() => setStep(2)}
                        />
                      )}
                      {step === 2 && (
                        <ProjectWizardStep2
                          key="step2"
                          city={city}
                          setCity={setCity}
                          areaSqm={areaSqm}
                          setAreaSqm={setAreaSqm}
                          floors={floors}
                          setFloors={setFloors}
                          onNext={() => setStep(3)}
                          onBack={() => setStep(1)}
                        />
                      )}
                      {step === 3 && (
                        <ProjectWizardStep3
                          key="step3"
                          specifications={specifications}
                          setSpecifications={setSpecifications}
                          additionalNotes={additionalNotes}
                          setAdditionalNotes={setAdditionalNotes}
                          onGenerate={handleGenerate}
                          onBack={() => setStep(2)}
                          isGenerating={isGenerating}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Trust bar */}
                <div className="flex items-center justify-center gap-6 mt-6 p-4 bg-[#f8fafd] rounded-[4px] border border-[#d8d6df]">
                  <div className="flex items-center gap-2 text-[11px] font-light text-[#50617a]">
                    <Shield className="w-3.5 h-3.5 text-[#FA6400]" />
                    <span>{isRTL ? "بياناتك مشفرة" : "Data encrypted"}</span>
                  </div>
                  <div className="w-px h-4 bg-[#d8d6df]" />
                  <div className="flex items-center gap-2 text-[11px] font-light text-[#50617a]">
                    <Zap className="w-3.5 h-3.5 text-[#FA6400]" />
                    <span>{isRTL ? "٥٠ قائمة مجانية" : "50 free BOQs"}</span>
                  </div>
                  <div className="w-px h-4 bg-[#d8d6df]" />
                  <div className="flex items-center gap-2 text-[11px] font-light text-[#50617a]">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FA6400]" />
                    <span>{isRTL ? "منتجات من بنّة" : "Benna products"}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Social proof / How-it-works strip ── */}
      {!result && !showPaywall && !isGenerating && (
        <div className="bg-[#f8fafd] border-t border-[#d8d6df]" id="how-it-works">
          <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 xl:px-8 py-12">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-5 h-0.5 bg-[#FA6400] rounded-full" />
                  <span className="text-xs font-light text-[#FA6400] uppercase tracking-widest">
                    {isRTL ? "كيف يعمل" : "How it works"}
                  </span>
                  <div className="w-5 h-0.5 bg-[#FA6400] rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    num: "01",
                    titleEn: "Describe your project",
                    titleAr: "صِف مشروعك",
                    descEn: "Name it, pick the type, city, area, floors, and any special specs",
                    descAr: "سمّه، اختر النوع والمدينة والمساحة والأدوار وأي مواصفات خاصة",
                    icon: Building2,
                  },
                  {
                    num: "02",
                    titleEn: "Benna builds your BOQ",
                    titleAr: "بنّة تبني قائمتك",
                    descEn: "The engine calculates materials, quantities, and matches real catalog products",
                    descAr: "المحرك يحسب المواد والكميات ويربطها بمنتجات حقيقية من الكتالوج",
                    icon: Calculator,
                  },
                  {
                    num: "03",
                    titleEn: "Shop & export",
                    titleAr: "تسوّق وصدّر",
                    descEn: "Add matched Benna catalog products to cart instantly or export a contractor-ready CSV",
                    descAr: "أضف منتجات كتالوج Benna المطابقة للسلة فوراً أو صدّر ملف CSV جاهزاً للمقاول",
                    icon: ShoppingCart,
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-4"
                    >
                      <div className="shrink-0">
                        <div className="w-10 h-10 rounded-[4px] bg-[#e5edf5] flex items-center justify-center">
                          <Icon className="w-5 h-5 text-[#FA6400]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-light text-[#FA6400] tracking-widest">{item.num}</span>
                          <h3 className="text-[14px] font-light text-[#061b31]">
                            {isRTL ? item.titleAr : item.titleEn}
                          </h3>
                        </div>
                        <p className="text-[12px] font-light text-[#50617a] leading-relaxed">
                          {isRTL ? item.descAr : item.descEn}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── "What Benna Built" Feature Showcase ── */}
      {!result && !showPaywall && !isGenerating && (
        <div className="bg-[#f8fafd] border-t border-[#d8d6df]">
          <div className="px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-6 h-0.5 bg-[#FA6400] rounded-full" />
                <span className="text-xs font-light text-[#FA6400] uppercase tracking-widest">
                  {isRTL ? "ما بنيناه لك" : "What we built for you"}
                </span>
                <div className="w-6 h-0.5 bg-[#FA6400] rounded-full" />
              </div>
              <h2
                className="text-[#061b31]"
                style={{ fontSize: "22px", fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.01px" }}
              >
                {isRTL ? "منظومة كميات بسيطة وقابلة للشراء" : "A simple shoppable BOQ system"}
              </h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {WHAT_WE_BUILT.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                    className="bg-white rounded-[6px] border border-[#d8d6df] p-5 hover:shadow-[rgba(23,23,23,0.08)_0px_15px_35px_0px] hover:border-[#FA6400] transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-[4px] bg-[#e5edf5] flex items-center justify-center mb-4 group-hover:bg-[#FA6400] transition-colors duration-300">
                      <Icon className="w-5 h-5 text-[#FA6400] group-hover:text-white transition-colors duration-300" />
                    </div>
                    <h3 className="text-[#061b31] mb-1" style={{ fontSize: "14px", fontWeight: 400, lineHeight: 1.4 }}>
                      {isRTL ? item.titleAr : item.titleEn}
                    </h3>
                    <p className="text-[#50617a] mb-4" style={{ fontSize: "12px", fontWeight: 300, lineHeight: 1.5 }}>
                      {isRTL ? item.descAr : item.descEn}
                    </p>
                    <div className="flex items-baseline gap-1.5 pt-3 border-t border-[#e5edf5]">
                      <span className="text-[#FA6400]" style={{ fontSize: "18px", fontWeight: 300 }}>{item.stat}</span>
                      <span className="text-[#64748d]" style={{ fontSize: "11px", fontWeight: 300 }}>
                        {isRTL ? item.statLabelAr : item.statLabelEn}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Alibaba-style left-edge quick actions rail */}
      <SideActionRail />
    </main>,
  );
};

export default BuildProjectPage;
