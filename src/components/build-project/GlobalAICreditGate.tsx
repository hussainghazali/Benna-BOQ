// src/components/build-project/GlobalAICreditGate.tsx
// Mounts globally and listens for the AI_PAYWALL_EVENT. When an AI call fails
// because the workspace ran out of AI credits, it pops a clean dialog with the
// CreditPaywall embedded — no raw "non-2xx" errors leak to the user.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import CreditPaywall from "./CreditPaywall";
import { AI_PAYWALL_EVENT, type AiPaywallDetail } from "@/lib/ai-error-handler";

const GlobalAICreditGate = () => {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AiPaywallDetail | null>(null);

  useEffect(() => {
    const onPaywall = (e: Event) => {
      const ce = e as CustomEvent<AiPaywallDetail>;
      setDetail(ce.detail || null);
      setOpen(true);
    };
    window.addEventListener(AI_PAYWALL_EVENT, onPaywall as EventListener);
    return () => window.removeEventListener(AI_PAYWALL_EVENT, onPaywall as EventListener);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden bg-white border border-[#e5e5e5] rounded-xl"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <DialogHeader className="px-6 pt-6 pb-2 border-b border-[#eef0f4]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF6600]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#FF6600]" />
            </div>
            <div>
              <DialogTitle className="text-[18px] font-normal text-[#222222]">
                {isRTL ? "أضف رصيداً للمتابعة" : "Add credits to continue"}
              </DialogTitle>
              <DialogDescription className="text-[13px] font-normal text-[#888888] mt-0.5">
                {detail?.message ||
                  (isRTL
                    ? "اختر باقة لمتابعة استخدام ميزات الذكاء الاصطناعي في بنّة."
                    : "Pick a pack to keep using Benna's AI features.")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          <CreditPaywall embedded onPurchaseComplete={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalAICreditGate;
