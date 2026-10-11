// src/lib/api-boq-activity.ts
// Client wrapper for BOQ activity logging.
import { apiClient } from "./api-client";

export interface BOQActivityPayload {
  customerId?: string | null;
  boqId: string;
  event:
    | "generated"
    | "add_to_cart_row"
    | "add_all_to_cart"
    | "feedback"
    | "csv_export"
    | "swap_product";
  projectInputs?: Record<string, any>;
  totalEstimate?: number;
  itemsCount?: number;
  matchedCount?: number;
  addedToCartItems?: Array<{ productId: string; quantity: number }>;
  feedback?: {
    accuracyRating?: number;
    pricingRating?: number;
    improvements?: string[];
    comment?: string;
  };
  metadata?: Record<string, any>;
}

export const boqActivityApi = {
  log: (payload: BOQActivityPayload) =>
    apiClient<{ success: boolean }>("/users/website/boq-activity", {
      method: "POST",
      body: JSON.stringify(payload),
    }).catch(() => ({ success: false })),
};
