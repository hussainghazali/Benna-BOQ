// src/lib/boq-gap-logger.ts
import { apiClient } from "@/lib/api-client";
import type { BOQRecommendationResult } from "@/lib/benna-catalog";
import { createLogger } from "@/lib/logger";

const logger = createLogger("BOQGaps");

interface BOQItem {
  category: string;
  item: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  brand?: string;
}

interface LogGapsParams {
  customerId?: string | null;
  projectId?: string | null;
  projectName?: string;
  projectType?: string;
  city?: string;
  areaSqm?: number;
  floors?: number;
  items: BOQItem[];
  recommendations: BOQRecommendationResult;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

/**
 * Identifies which BOQ items the Benna catalog could NOT match and reports them.
 * Fire-and-forget: never blocks the user, but retries silently.
 */
export const logBoqCatalogGaps = async ({
  customerId,
  projectId,
  projectName = "",
  projectType = "",
  city = "",
  areaSqm = 0,
  floors = 1,
  items,
  recommendations,
}: LogGapsParams): Promise<void> => {
  try {
    if (!Array.isArray(items) || items.length === 0) return;

    // Build a set of BOQ items that DID get a recommendation
    const matchedKeys = new Set(
      recommendations.featuredProducts.map((r) =>
        `${r.matchedCategory}__${r.matchedItem}`.toLowerCase(),
      ),
    );

    const gaps = items
      .filter((i) => !matchedKeys.has(`${i.category}__${i.item}`.toLowerCase()))
      .map((i) => ({
        category: i.category,
        item: i.item,
        brand: i.brand || "",
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        score: 0, // unmatched
      }));

    if (gaps.length === 0) return;

    const payload = {
      customerId: customerId || null,
      projectId: projectId || null,
      projectName,
      projectType,
      city,
      areaSqm,
      floors,
      gaps,
    };

    // Attempt with retries
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await apiClient("/users/website/boq-gaps/log", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        logger.info(
          `Reported ${gaps.length} unmatched items (attempt ${attempt + 1})`,
        );
        return; // Success
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        }
      }
    }

    logger.warn(
      `[BOQ Gaps] Failed to log gaps after ${MAX_RETRIES + 1} attempts`,
      { error: lastError as unknown },
    );
  } catch (err) {
    // Non-critical — never disrupt the user
    logger.warn("[BOQ Gaps] Unexpected error in gap logger", { error: err });
  }
};
