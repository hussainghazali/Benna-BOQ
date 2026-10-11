// src/lib/boq-recommendations.ts
import type { CartProduct } from "@/lib/api-client";
import type { CatalogRecommendation } from "@/lib/benna-catalog";
import { getProductImage } from "@/utils/imageUtils";

import { getDiscountedPrice } from "@/utils/productPricing";

// Re-exported so BOQ surfaces (e.g. BOQRecommendationsPanel) stay in step with
// the rest of the storefront — and with the backend's effectiveUnitPrice.
export { getDiscountedPrice };

export const buildCartProduct = (
  recommendation: CatalogRecommendation,
): CartProduct => {
  const { product } = recommendation;

  if (!product) {
    throw new Error("Invalid recommendation: missing product data");
  }

  const finalPrice = getDiscountedPrice(
    product.price,
    product.discountMode,
    product.discountValue,
  );

  return {
    productId: product._id,
    productName: product.name || "Unknown Product",
    uniqueProductSlug: product.uniqueProductSlug || "",
    productPrice: finalPrice,
    productQuantity: 1,
    productImageUrl: getProductImage(product.productImageUrl),
    vendorId: product.uploadedByVendorId || "",
    availableStock:
      product.inventoryTracking?.trackInventory === true
        ? (product.inventoryTracking.quantity ?? undefined)
        : undefined,
  };
};
