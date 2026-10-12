// src/components/build-project/CreditStatusBar.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { hasGuestFreeTrial } from "@/hooks/useBOQGeneration";
import { Button } from "@/components/ui/button";
import { Coins, Loader2, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  onBuyCredits: () => void;
}

const CreditStatusBar = ({ onBuyCredits }: Props) => {
  const { isRTL } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { credits, isLoading } = useCredits();

  const hasActiveSubscription =
    credits?.subscriptionPlan?.includes("business") &&
    credits?.subscriptionExpiresAt &&
    new Date(credits.subscriptionExpiresAt) > new Date();

  const balance = credits?.balance ?? 0;
  const hasBalance = balance > 0;
  const guestTrialAvailable = !isAuthenticated && hasGuestFreeTrial();
  const hasCredits = hasActiveSubscription || hasBalance || guestTrialAvailable;
  // Still within the original free-50 allotment as long as nothing's ever
  // been purchased — once totalPurchased > 0, remaining balance is a paid
  // (or mixed) balance, so drop the "free" label.
  const stillOnFreeAllotment = (credits?.totalPurchased ?? 0) === 0;

  if (!isAuthenticated && !guestTrialAvailable) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex items-center justify-between gap-3 rounded-[4px] px-4 py-2.5 border",
        hasCredits
          ? "bg-[#e5edf5] border-[#d8d6df]"
          : "bg-[#f8fafd] border-[#d8d6df]",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#64748d] shrink-0" />
        ) : guestTrialAvailable ? (
          <Sparkles className="w-4 h-4 text-[#FF6600] shrink-0" />
        ) : (
          <Coins
            className={cn(
              "w-4 h-4 shrink-0",
              hasCredits ? "text-[#FF6600]" : "text-[#64748d]",
            )}
          />
        )}
        <span
          className={cn(
            "text-xs font-light truncate",
            hasCredits ? "text-[#061b31]" : "text-[#50617a]",
          )}
        >
          {isLoading
            ? isRTL
              ? "جاري التحميل..."
              : "Loading..."
            : hasActiveSubscription
              ? isRTL
                ? "اشتراك غير محدود نشط"
                : "Unlimited subscription active"
              : guestTrialAvailable
                ? isRTL
                  ? "🎁 توليد مجاني واحد متاح"
                  : "🎁 1 free guest generation"
                : hasBalance
                  ? stillOnFreeAllotment
                    ? isRTL
                      ? `${balance} قائمة مجانية متبقية`
                      : `${balance} free BOQ${balance !== 1 ? "s" : ""} left`
                    : isRTL
                      ? `${balance} رصيد متاح`
                      : `${balance} credit${balance !== 1 ? "s" : ""} remaining`
                  : isRTL
                    ? "لا يوجد رصيد كافٍ"
                    : "No credits remaining"}
        </span>
      </div>

      {isAuthenticated && !hasCredits && !isLoading && (
        <Button
          onClick={onBuyCredits}
          size="sm"
          className="h-7 px-3 text-xs font-light bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-[4px] shrink-0 gap-1"
        >
          <Zap className="w-3 h-3" />
          {isRTL ? "شراء رصيد" : "Buy Credits"}
        </Button>
      )}

      {isAuthenticated &&
        hasCredits &&
        !hasActiveSubscription &&
        !isLoading && (
          <button
            onClick={onBuyCredits}
            className="text-[10px] font-light text-[#FF6600] hover:text-[#E65C00] underline underline-offset-2 shrink-0 whitespace-nowrap"
          >
            {isRTL ? "احصل على المزيد" : "Get more"}
          </button>
        )}
    </motion.div>
  );
};

export default CreditStatusBar;
