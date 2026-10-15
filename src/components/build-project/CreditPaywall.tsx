// src/components/build-project/CreditPaywall.tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Zap,
  Crown,
  Rocket,
  Check,
  Sparkles,
  Shield,
  CreditCard,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { getCurrentUserId } from "@/lib/auth-session";
import { locNum } from "@/utils/formatPrice";

const CREDIT_PACKS = [
  {
    id: "free_50",
    credits: 50,
    price: 0,
    nameEn: "Free Trial",
    nameAr: "مجانية",
    icon: Sparkles,
    popular: false,
    free: true,
    features: ["50 free BOQ generations", "Shoppable BOQ table", "CSV export"],
    featuresAr: ["٥٠ قائمة كميات مجانية", "جدول قابل للشراء", "تصدير CSV"],
  },
  {
    id: "boq_100",
    credits: 100,
    price: 10,
    nameEn: "100 BOQs",
    nameAr: "١٠٠ قائمة",
    icon: Zap,
    popular: false,
    features: ["100 BOQ generations", "CSV export", "Material list"],
    featuresAr: ["١٠٠ قائمة كميات", "تصدير CSV", "قائمة مواد"],
  },
  {
    id: "boq_250",
    credits: 250,
    price: 25,
    nameEn: "250 BOQs",
    nameAr: "٢٥٠ قائمة",
    icon: Crown,
    popular: true,
    features: [
      "250 BOQ generations",
      "Best for active projects",
      "CSV export",
      "Matched Benna products",
    ],
    featuresAr: [
      "٢٥٠ قائمة كميات",
      "الأفضل للمشاريع النشطة",
      "تصدير CSV",
      "منتجات بنّة مطابقة",
    ],
  },
  {
    id: "boq_500",
    credits: 500,
    price: 50,
    nameEn: "500 BOQs",
    nameAr: "٥٠٠ قائمة",
    icon: Rocket,
    popular: false,
    features: [
      "500 BOQ generations",
      "For contractors",
      "Bulk BOQ workflows",
      "CSV export",
    ],
    featuresAr: [
      "٥٠٠ قائمة كميات",
      "للمقاولين",
      "استخدام مكثف للقوائم",
      "تصدير CSV",
    ],
  },
  {
    id: "boq_1000",
    credits: 1000,
    price: 100,
    nameEn: "1000 BOQs",
    nameAr: "١٠٠٠ قائمة",
    icon: Coins,
    popular: false,
    features: [
      "1000 BOQ generations",
      "Best unit price",
      "High-volume teams",
      "CSV export",
    ],
    featuresAr: [
      "١٠٠٠ قائمة كميات",
      "أفضل سعر للوحدة",
      "للفرق كثيرة الاستخدام",
      "تصدير CSV",
    ],
  },
];

interface Props {
  onPurchaseComplete?: () => void;
  embedded?: boolean; // If true, don't redirect full page
}

const CreditPaywall = ({ onPurchaseComplete, embedded = false }: Props) => {
  const { isRTL } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle");

  // Check for payment return
  useEffect(() => {
    const paymentStatus = searchParams.get("payment_status");
    const creditsParam = searchParams.get("credits");
    const packageParam = searchParams.get("package");

    if (paymentStatus === "success" || creditsParam) {
      setPaymentStatus("success");
      toast.success(
        isRTL ? `تمت إضافة الرصيد بنجاح!` : "Credits added successfully!",
      );
      refetchCredits();
      if (onPurchaseComplete) onPurchaseComplete();

      // Clean URL
      navigate(location.pathname, { replace: true });
    } else if (paymentStatus === "failed") {
      setPaymentStatus("failed");
      toast.error(
        isRTL
          ? "فشلت عملية الدفع. يرجى المحاولة مرة أخرى."
          : "Payment failed. Please try again.",
      );
    }
  }, [
    searchParams,
    isRTL,
    refetchCredits,
    onPurchaseComplete,
    navigate,
    location.pathname,
  ]);

  // Prevent double-clicks
  const isProcessingRef = useRef(false);

  const handlePurchase = useCallback(
    async (packageId: string) => {
      if (authLoading) {
        toast.info(
          isRTL ? "جاري التحقق من تسجيل الدخول..." : "Checking session...",
        );
        return;
      }

      if (isProcessingRef.current) {
        toast.info(isRTL ? "جاري المعالجة..." : "Processing...");
        return;
      }

      const customerId = user?.id || getCurrentUserId();

      if (!customerId || !isAuthenticated) {
        toast.error(
          isRTL
            ? "يرجى تسجيل الدخول أولاً لشراء الرصيد"
            : "Please log in first to purchase credits.",
        );
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }

      // Check if already has active subscription for same tier
      if (
        credits?.subscriptionPlan === packageId &&
        credits?.subscriptionExpiresAt &&
        new Date(credits.subscriptionExpiresAt) > new Date()
      ) {
        toast.info(
          isRTL
            ? "لديك بالفعل هذا الاشتراك النشط"
            : "You already have this active subscription",
        );
        return;
      }

      isProcessingRef.current = true;
      setPurchasing(packageId);
      setPaymentStatus("processing");

      try {
        // Generate proper idempotency key
        const idempotencyKey = `purchase-${customerId}-${packageId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const data = await apiClient<{
          success?: boolean;
          credited?: boolean;
          alreadyClaimed?: boolean;
          balance?: number;
          redirect_url: string;
          tran_ref: string;
        }>("/users/website/credits/purchase", {
          method: "POST",
          body: JSON.stringify({
            customerId,
            packageId,
            idempotencyKey,
          }),
        });

        if (data?.redirect_url) {
          toast.info(
            isRTL ? "جاري التحويل للدفع..." : "Redirecting to payment...",
          );

          if (embedded) {
            // Open in new tab for embedded mode
            window.open(data.redirect_url, "_blank");
          } else {
            // Full redirect
            window.location.href = data.redirect_url;
          }
        } else if (data?.success || data?.credited || data?.alreadyClaimed) {
          toast.success(
            isRTL
              ? "تم تحديث رصيد قوائم الكميات."
              : "Your BOQ credits are ready.",
          );
          await refetchCredits();
          setPaymentStatus("success");
          onPurchaseComplete?.();
        } else {
          throw new Error("No redirect URL received");
        }
      } catch (err: any) {
        console.error("Purchase error:", err, err?.data);
        const msg =
          err?.data?.message || err?.message || "Something went wrong";
        toast.error(isRTL ? "حدث خطأ. حاول مرة أخرى." : msg);
        setPaymentStatus("failed");
      } finally {
        setPurchasing(null);
        isProcessingRef.current = false;
      }
    },
    [
      authLoading,
      user,
      isAuthenticated,
      credits,
      navigate,
      location.pathname,
      onPurchaseComplete,
      isRTL,
      embedded,
      refetchCredits,
    ],
  );

  if (paymentStatus === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-[#FF6600] rounded-lg flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-normal text-[#222222] mb-2">
          {isRTL ? "تمت العملية بنجاح!" : "Payment Successful!"}
        </h2>
        <p className="text-[#666666] font-normal mb-6">
          {isRTL
            ? "تمت إضافة الرصيد إلى حسابك"
            : "Credits have been added to your account"}
        </p>
        <Button
          onClick={() => setPaymentStatus("idle")}
          className="bg-[#FF6600] hover:bg-[#FF6600] text-white rounded-lg font-normal"
        >
          {isRTL ? "العودة للباقات" : "Back to Packages"}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 overflow-hidden relative"
          style={{ background: "linear-gradient(90deg, rgb(255,115,0) 3.13%, rgb(255,102,0) 50%, rgb(255,61,0))" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(circle at 30% 50%, rgb(127,125,252) 0%, transparent 60%)" }}
          />
          <Coins className="w-8 h-8 text-white relative z-10" />
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.01px" }} className="text-[#222222] mb-2">
          {isRTL
            ? "احصل على رصيد لتوليد قوائم الكميات"
            : "Get Credits to Generate BOQs"}
        </h2>
        <p className="text-[#666666] font-normal">
          {isRTL
            ? "اختر الباقة المناسبة لاحتياجاتك"
            : "Choose a package that fits your needs"}
        </p>
        {credits && (
          <p className="text-sm text-[#888888] mt-2 font-normal">
            {credits.isUnlimited
              ? isRTL
                ? "غير محدود"
                : "Unlimited"
              : (credits.totalPurchased ?? 0) === 0
                ? isRTL
                  ? `متبقٍ من قوائمك المجانية: ${credits.balance}`
                  : `Free BOQs remaining: ${credits.balance}`
                : isRTL
                  ? `الرصيد الحالي: ${credits.balance}`
                  : `Current balance: ${credits.balance}`}
          </p>
        )}
      </div>

      {/* Credit Packs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CREDIT_PACKS.map((pkg, i) => {
            const Icon = pkg.icon;
            // Free 50 is claimable exactly once, ever (product spec). Once
            // freeTrialUsed is true server-side, disable the card instead of
            // letting the customer click it and get a 409 toast.
            const alreadyClaimedFree = Boolean(pkg.free && credits?.freeTrialUsed);
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={cn(
                  "relative rounded-xl border overflow-hidden transition-all bg-white",
                  pkg.popular
                    ? "border-[#FF6600] scale-[1.02]"
                    : "border-[#e5e5e5] hover:border-[#FF6600]",
                )}
                style={pkg.popular ? { boxShadow: "rgba(50,50,93,0.12) 0px 16px 32px 0px" } : { boxShadow: "rgba(23,23,23,0.06) 0px 3px 6px 0px" }}
              >
                {/* Popular card sunburst header strip */}
                {pkg.popular && (
                  <div
                    className="h-1 w-full"
                    style={{ background: "linear-gradient(90deg, rgb(255,115,0) 3.13%, rgb(255,102,0) 50%, rgb(255,61,0))" }}
                  />
                )}
                {pkg.popular && (
                  <Badge className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#FF6600] text-white font-normal shadow-sm border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {isRTL ? "الأكثر شيوعاً" : "Most Popular"}
                  </Badge>
                )}
                <div className="p-6">
                {pkg.popular && <div className="h-6" />}{/* spacer for badge */}
                <div className="text-center mb-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center",
                      pkg.popular ? "bg-[#f0f0f0]" : "bg-[#f7f7f7]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6",
                        pkg.popular ? "text-[#FF6600]" : "text-[#888888]",
                      )}
                    />
                  </div>
                  <h3 className="font-normal text-lg text-[#222222]">
                    {isRTL ? pkg.nameAr : pkg.nameEn}
                  </h3>
                  <div className="mt-2">
                    <span className="text-3xl font-normal text-[#222222]">
                      {pkg.price === 0 ? (isRTL ? "مجاني" : "Free") : `﷼${locNum(pkg.price)}`}
                    </span>
                  </div>
                  <p className="text-sm text-[#666666] mt-1 font-normal">
                    {locNum(pkg.credits)} {isRTL ? "قائمة كميات" : "BOQs"}
                    {pkg.price > 0 && (
                      <>
                        {" • ﷼"}
                        {locNum(pkg.price / pkg.credits, {
                          maximumFractionDigits: 2,
                        })}
                        /{isRTL ? "قائمة" : "BOQ"}
                      </>
                    )}
                  </p>
                </div>
                <ul className="space-y-2 mb-6">
                  {(isRTL ? pkg.featuresAr : pkg.features).map((f, fi) => (
                    <li
                      key={fi}
                      className="flex items-center gap-2 text-sm text-[#666666] font-normal"
                    >
                      <Check className="w-4 h-4 shrink-0 text-[#FF6600]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={
                    purchasing !== null ||
                    authLoading ||
                    isProcessingRef.current ||
                    alreadyClaimedFree
                  }
                  className={cn(
                    "w-full h-11 rounded-lg font-normal",
                    alreadyClaimedFree
                      ? "bg-[#f7f7f7] text-[#888888] border border-[#e5e5e5] cursor-not-allowed"
                      : pkg.popular
                        ? "bg-[#FF6600] hover:bg-[#FF6600] text-white"
                        : "border border-[#e5e5e5] hover:border-[#FF6600] text-[#222222]",
                  )}
                  variant={pkg.popular ? "default" : "outline"}
                >
                  {purchasing === pkg.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      {isRTL ? "جاري التحويل..." : "Redirecting..."}
                    </>
                  ) : alreadyClaimedFree ? (
                    isRTL ? "تم الاستخدام" : "Already Claimed"
                  ) : pkg.price === 0 ? (
                    isRTL ? "احصل على ٥٠ مجاناً" : "Claim Free 50"
                  ) : isRTL ? (
                    "اشترِ الآن"
                  ) : (
                    "Buy Now"
                  )}
                </Button>
                </div>{/* end p-6 wrapper */}
              </motion.div>
            );
          })}
        </div>

      {/* Payment trust badges */}
      <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-[#888888] font-normal">
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-[#FF6600]" />
          {isRTL ? "دفع آمن" : "Secure Payment"}
        </span>
        <span className="flex items-center gap-1">
          <CreditCard className="w-3 h-3 text-[#FF6600]" />
          Visa / Mastercard / Mada
        </span>
        <span className="flex items-center gap-1">🍎 Apple Pay</span>
      </div>

      {paymentStatus === "failed" && (
        <div className="flex items-center gap-2 justify-center text-[#666666] text-sm font-normal">
          <AlertTriangle className="w-4 h-4 text-[#FF6600]" />
          {isRTL
            ? "فشلت عملية الدفع. يرجى المحاولة مرة أخرى."
            : "Payment failed. Please try again."}
        </div>
      )}
    </motion.div>
  );
};

export default CreditPaywall;
