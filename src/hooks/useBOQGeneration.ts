// src/hooks/useBOQGeneration.ts
// Simple, deterministic BOQ generator. No AI. Uses rule engine + catalog matcher.
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/lib/auth-session";
import { buildBOQ, BOQInput } from "@/lib/boq-engine";
import { matchBOQLines, MatchedBOQLine } from "@/lib/boq-engine/matcher";
import { boqActivityApi } from "@/lib/api-boq-activity";
import { logBoqCatalogGaps } from "@/lib/boq-gap-logger";
import { boqApi } from "@/lib/api-boq";

// Free-trial and credit enforcement live on the backend. The client never
// grants trials or bypasses paywalls via localStorage (that state is
// trivially cleared to farm free BOQs).
export const hasGuestFreeTrial = () => false;

export interface BOQResultV3 {
  boqId: string;
  input: BOQInput;
  lines: MatchedBOQLine[];
  totalEstimate: number;
  matchedCount: number;
  unmatchedCount: number;
  createdAt: string;
}

export const useBOQGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<BOQResultV3 | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const isProcessingRef = useRef(false);

  const generate = useCallback(
    async (input: BOQInput): Promise<{ ok: boolean; boqId?: string; outOfCredits?: boolean }> => {
      if (isProcessingRef.current) {
        toast.info("A generation is already in progress...");
        return { ok: false };
      }
      isProcessingRef.current = true;
      setIsGenerating(true);

      const customerId = getCurrentUserId();
      const isGuest = !customerId;

      // Sign-in required. Server enforces credits; no client-side trial bypass.
      if (isGuest) {
        toast.error("Please sign in to generate a BOQ.");
        setIsGenerating(false);
        isProcessingRef.current = false;
        return { ok: false };
      }

      try {
        // 1. Deterministic engine
        const lines = buildBOQ(input);

        // 2. Match against catalog (parallel)
        const matched = await matchBOQLines(lines);
        const totalEstimate = matched.reduce((s, m) => s + m.lineTotal, 0);
        const matchedCount = matched.filter((m) => m.matched).length;

        // 3. Persist the project + deduct 1 BOQ credit on the backend, in one
        // atomic call. New users are granted 50 free BOQs server-side.
        // IMPORTANT: this is the ONLY credit-consuming call for a BOQ
        // generation — createBOQProject deducts internally. Do not also call
        // /credits/deduct here, that would charge the customer twice.
        let created;
        try {
          created = await boqApi.createBOQProject({
            projectName: input.projectName,
            projectType: input.projectType,
            city: input.city,
            areaSqm: Number(input.areaSqm),
            floors: Number(input.floors),
            specifications: {
              finishingTier: input.finishingTier,
              hasBasement: input.hasBasement,
              features: input.features,
            },
            // Shape must match what BOQProjectDetailPage.tsx reads back later
            // ({ items: [{category,item,unit,quantity,unitPrice,totalPrice,
            // brand}], totalEstimatedCost }) — boqResult is a schemaless
            // Mixed field on the backend, so whatever we write here is
            // exactly what the detail page gets, unvalidated.
            boqResult: {
              items: matched.map((m) => ({
                category: m.line.category,
                item: m.line.item,
                unit: m.line.unit,
                quantity: m.line.quantity,
                unitPrice: m.unitPrice,
                totalPrice: m.lineTotal,
                brand: m.match?.brand,
              })),
              totalEstimatedCost: totalEstimate,
            },
            estimatedCost: totalEstimate,
          });
        } catch (err: any) {
          const status = err?.status;
          if (status === 402) {
            // Backend picks the right wording (free-trial-used vs
            // out-of-paid-credits) since it's the one that actually knows
            // totalPurchased — don't duplicate/hardcode that logic here.
            toast.error(
              err?.data?.message ||
                "You're out of BOQ credits. Choose a package to continue.",
            );
            setIsGenerating(false);
            isProcessingRef.current = false;
            return { ok: false, outOfCredits: true };
          }
          console.error("BOQ project save failed:", err);
          toast.error(err?.message || "Failed to save your BOQ. Please try again.");
          setIsGenerating(false);
          isProcessingRef.current = false;
          return { ok: false };
        }

        const boqId = created._id;
        const out: BOQResultV3 = {
          boqId,
          input,
          lines: matched,
          totalEstimate,
          matchedCount,
          unmatchedCount: matched.length - matchedCount,
          createdAt: created.createdAt || new Date().toISOString(),
        };
        setResult(out);

        // 4. Log activity (non-blocking)
        boqActivityApi.log({
          customerId: customerId || null,
          boqId,
          event: "generated",
          projectInputs: input as any,
          totalEstimate,
          itemsCount: matched.length,
          matchedCount,
        });

        // 5. Log catalog gaps for unmatched items
        try {
          logBoqCatalogGaps({
            customerId,
            projectId: boqId,
            projectName: input.projectName,
            projectType: input.projectType,
            city: input.city,
            areaSqm: input.areaSqm,
            floors: input.floors,
            items: matched.map((m) => ({
              category: m.line.category,
              item: m.line.item,
              unit: m.line.unit,
              quantity: m.line.quantity,
              unitPrice: m.unitPrice,
              totalPrice: m.lineTotal,
            })),
            recommendations: matched.map((m) =>
              m.match ? [{ productId: m.match.productId, name: m.match.name }] : [],
            ) as any,
          });
        } catch {
          /* non-critical */
        }

        toast.success("Your BOQ is ready!");
        return { ok: true, boqId };
      } catch (err: any) {
        console.error("BOQ generation error:", err);
        toast.error(err?.message || "Failed to generate BOQ.");
        return { ok: false };
      } finally {
        setIsGenerating(false);
        isProcessingRef.current = false;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setCreditsRemaining(null);
  }, []);

  return {
    generate,
    isGenerating,
    result,
    setResult,
    reset,
    creditsRemaining,
    generationId: result?.boqId ?? null,
  };
};
