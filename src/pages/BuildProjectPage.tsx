// src/pages/BuildProjectPage.tsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeo, getBOQServiceSchema, getSpeakableSchema } from "@/lib/seo";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useBOQGeneration } from "@/hooks/useBOQGeneration";
import { MAX_AREA_SQM, MAX_FLOORS } from "@/lib/boq-engine";

import { trackEvent } from "@/lib/tracking";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
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

  useSeo({
    title: "Build My Project - Free BOQ Builder for Construction",
    titleAr: "ابنِ مشروعك - حاسبة كميات البناء المجانية",
    description:
      "Get a free, shoppable Bill of Quantities (BOQ) for your construction project in Saudi Arabia. Match materials to Benna products and export it as CSV.",
    descriptionAr:
      "احصل على قائمة كميات مجانية قابلة للشراء لمشروعك في السعودية، وطابق المواد مع منتجات بنّة وصدّرها بصيغة CSV. فلل، شقق، مباني تجارية، مستودعات، وتجديدات.",
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

  const shellWrapper = (content: React.ReactNode) => (
    <div className="min-h-screen bg-white">
      <Header />
      {content}
      <Footer />
      <SideActionRail />
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
      {/* ── Hero Band ── */}
      <section
        className="border-b border-ali-line-200"
        style={{
          background:
            "linear-gradient(90deg, #FFFFFF 0%, #FFF9F4 25%, #FFF0E5 50%, #FFF9F4 75%, #FFFFFF 100%)",
          backgroundSize: "200% 100%",
          animation: "gradient-shift 12s ease-in-out infinite",
        }}
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 xl:px-8 py-6 md:py-8">
          <h1 className="max-w-2xl text-3xl lg:text-4xl font-semibold tracking-tight text-ali-ink-900">
            {isRTL ? (
              <>
                أداة بناء جداول الكميات{" "}
                <span className="text-ali-orange-500">الأولى في السعودية</span>
              </>
            ) : (
              <>
                KSA's <span className="text-ali-orange-500">#1 BOQ builder</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-sm text-ali-ink-500">
            {isRTL
              ? "صِف مشروعك · احصل على قائمة كميات قابلة للشراء · صدّرها بنقرة واحدة"
              : "Describe your project · Get a shoppable BOQ · Export it in one click"}
          </p>

          {/* CTAs, then stats row */}
          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#boq-wizard"
                className="inline-flex items-center rounded-full bg-ali-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ali-orange-600"
              >
                <FileText className="h-4 w-4 me-1.5" aria-hidden="true" />
                {isRTL ? "أنشئ قائمة الكميات" : "Generate my BOQ"}
              </a>
              <Link
                to="/boq/how-it-works"
                className="inline-flex items-center rounded-full border border-ali-ink-900 px-5 py-2.5 text-sm font-semibold text-ali-ink-900 transition-colors hover:bg-ali-bg-100"
              >
                {isRTL ? "كيف تعمل" : "How it works"}
              </Link>
              <a
                href="https://store.benna.com.sa/account/boq-projects"
                className="text-sm text-ali-ink-700 underline decoration-ali-line-300 underline-offset-4 transition-colors hover:text-ali-orange-500"
              >
                {isRTL ? "عرض مشاريعي" : "View my projects"}
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-ali-line-200 pt-5">
              {[
                { big: "50", label: isRTL ? "قائمة مجانية" : "Free BOQs" },
                {
                  big: isRTL ? "+184 ألف" : "184K+",
                  label: isRTL ? "منتج في الكتالوج" : "Products in catalog",
                },
                {
                  big: isRTL ? "+1,085" : "1,085+",
                  label: isRTL ? "فئة مغطاة" : "Categories covered",
                },
                {
                  big: "+165",
                  label: isRTL ? "مدينة سعودية بالأسعار" : "Saudi cities priced",
                },
                {
                  big: "CSV",
                  label: isRTL ? "تصدير جاهز للمقاولين" : "Export ready",
                },
              ].map(({ big, label }) => (
                <div key={label} className="flex items-baseline gap-2">
                  <p className="text-2xl font-medium tracking-tighter text-ali-ink-900 md:text-3xl">
                    {big}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ali-ink-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Wizard / Result Area ── */}
      <div id="boq-wizard" className="scroll-mt-24 bg-white">
        <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-10">
          <div className={cn(result ? "w-full max-w-[1400px] mx-auto" : "max-w-3xl xl:max-w-5xl 2xl:max-w-6xl mx-auto") }>
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
                    <div className="w-5 h-0.5 bg-[#FF6600] rounded-full" />
                    <span className="text-xs font-normal text-[#FF6600] uppercase tracking-widest">
                      {isRTL ? "ابدأ الآن" : "Get started"}
                    </span>
                    <div className="w-5 h-0.5 bg-[#FF6600] rounded-full" />
                  </div>
                  <p className="text-[14px] font-normal text-[#666666]">
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
                              "w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-500 border",
                              isDone
                                ? "bg-[#FF6600] border-[#FF6600] text-white"
                                : isActive
                                  ? "bg-white border-[#FF6600] text-[#222222]"
                                  : "bg-[#f7f7f7] border-[#e5e5e5] text-[#888888]",
                            )}
                            style={isActive ? { boxShadow: "rgba(255,102,0,0.15) 0px 0px 0px 3px" } : {}}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-[11px] font-normal transition-colors",
                              isDone
                                ? "text-[#FF6600]"
                                : isActive
                                  ? "text-[#222222]"
                                  : "text-[#888888]",
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
                                ? "bg-[#FF6600]"
                                : step === stepNum
                                  ? "bg-[#e5e5e5]"
                                  : "bg-[#f0f0f0]",
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
                  className="relative bg-white rounded-xl border border-[#e5e5e5] overflow-hidden"
                  style={{ boxShadow: "rgba(23,23,23,0.08) 0px 15px 35px 0px" }}
                >
                  {/* Violet top accent bar */}
                  <div
                    className="h-1 w-full"
                    style={{ background: "linear-gradient(90deg, rgb(255,115,0) 3.13%, rgb(255,102,0) 50%, rgb(255,61,0))" }}
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
                <div className="flex items-center justify-center gap-6 mt-6 p-4 bg-[#f7f7f7] rounded-lg border border-[#e5e5e5]">
                  <div className="flex items-center gap-2 text-[11px] font-normal text-[#666666]">
                    <Shield className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span>{isRTL ? "بياناتك مشفرة" : "Data encrypted"}</span>
                  </div>
                  <div className="w-px h-4 bg-[#e5e5e5]" />
                  <div className="flex items-center gap-2 text-[11px] font-normal text-[#666666]">
                    <Zap className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span>{isRTL ? "٥٠ قائمة مجانية" : "50 free BOQs"}</span>
                  </div>
                  <div className="w-px h-4 bg-[#e5e5e5]" />
                  <div className="flex items-center gap-2 text-[11px] font-normal text-[#666666]">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span>{isRTL ? "منتجات من بنّة" : "Benna products"}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>,
  );
};

export default BuildProjectPage;
