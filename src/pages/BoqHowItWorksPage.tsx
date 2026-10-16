import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HowItWorks, { type Step } from "@/components/ui/how-it-works";

const BoqHowItWorksPage = () => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const boqSteps: Step[] = [
    {
      title: t("Describe your project", "صِف مشروعك"),
      description: t(
        "Name it and pick the type — villa, tower, warehouse, renovation — plus city, area, floors, and special specs.",
        "سمّه واختر النوع — فيلا، برج، مستودع، تجديد — بالإضافة إلى المدينة والمساحة والأدوار والمواصفات الخاصة.",
      ),
      colorTheme: "orange",
    },
    {
      title: t("Benna builds your BOQ", "بنّا تبني قائمتك"),
      description: t(
        "The rule-based engine calculates materials and quantities for every construction phase in seconds.",
        "يحسب المحرك المواد والكميات لكل مرحلة بناء في ثوانٍ.",
      ),
      colorTheme: "blue",
    },
    {
      title: t("Live Saudi market pricing", "أسعار السوق السعودي الحية"),
      description: t(
        "Unit prices are indexed to 165+ Saudi cities using live contractor and supplier benchmarks updated monthly.",
        "أسعار الوحدة مؤشرة لأكثر من 165 مدينة سعودية باستخدام معايير حية للمقاولين والموردين تُحدَّث شهريًا.",
      ),
      colorTheme: "purple",
    },
    {
      title: t("Matched to real products", "مطابقة لمنتجات حقيقية"),
      description: t(
        "Every BOQ line item is matched to real Benna catalog products from 182K+ items — no guesswork.",
        "كل بند في القائمة مطابق لمنتجات حقيقية من كتالوج بنّا الذي يضم أكثر من 182 ألف منتج — بدون تخمين.",
      ),
      colorTheme: "orange",
    },
    {
      title: t("Shop & export", "تسوّق وصدّر"),
      description: t(
        "Export a structured CSV in one click, ready for contractors, consultants and suppliers.",
        "صدّر ملف CSV منظمًا بنقرة واحدة، جاهزًا للمقاولين والاستشاريين والموردين.",
      ),
      colorTheme: "blue",
    },
    {
      title: t("Save & reuse", "احفظ وأعد الاستخدام"),
      description: t(
        "Projects are saved to your account for reuse and revision — your first 50 BOQs are free.",
        "تُحفظ المشاريع في حسابك لإعادة الاستخدام والتعديل — أول 50 قائمة كميات مجانية.",
      ),
      colorTheme: "purple",
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#F4F4F4] text-[#222222] flex flex-col"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="sticky top-0 z-50 bg-[#F4F4F4] shadow-sm w-full">
        <Header />
      </div>

      <main className="flex-1 w-full">
        <div
          className="relative w-full h-[280px] sm:h-[360px] lg:h-[440px] overflow-hidden border-b border-ali-line-200"
          style={{
            background:
              "linear-gradient(90deg, #FFFFFF 0%, #FFF9F4 25%, #FFF0E5 50%, #FFF9F4 75%, #FFFFFF 100%)",
            backgroundSize: "200% 100%",
            animation: "gradient-shift 12s ease-in-out infinite",
          }}
        >
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center max-w-[1400px] mx-auto px-4 lg:px-6 xl:px-8 py-6 sm:py-8 lg:py-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-ali-ink-900">
              {t("How the BOQ builder works", "كيف تعمل أداة جداول الكميات")}
            </h1>
            <p className="text-base sm:text-lg text-ali-ink-500 mt-2 max-w-2xl">
              {t(
                "Describe your project once — get a shoppable, exportable materials list.",
                "صِف مشروعك مرة واحدة — واحصل على قائمة مواد قابلة للشراء والتصدير.",
              )}
            </p>
            <Link to="/build-project" className="mt-5 inline-flex w-fit">
              <button
                type="button"
                className="rounded-full bg-ali-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ali-orange-600"
              >
                {t("Build my BOQ", "أنشئ قائمة الكميات")}
              </button>
            </Link>
          </div>
        </div>

        <HowItWorks features={boqSteps} bgClassName="bg-ali-bg-100" />
      </main>

      <Footer />
    </div>
  );
};

export default BoqHowItWorksPage;
