// src/lib/cart-limits.ts
// Guard rails that stop absurd quantities/amounts from reaching the cart or
// the payment gateway. PayTabs rejects oversized carts with code 325
// ("Exceeds Limits"), which used to surface as an unreadable toast and left
// behind multi-billion SAR orders.

/** Hard cap on units of a single product in one cart line. */
export const MAX_LINE_QUANTITY = 5_000;

/** Hard cap on the value (SAR) of a single cart line. */
export const MAX_LINE_VALUE_SAR = 250_000;

/** Max cart total (SAR) we allow through the online payment gateway. */
export const MAX_GATEWAY_AMOUNT_SAR = 200_000;

/**
 * Clamp a computed BOQ quantity to something a real online order can carry.
 * Returns the safe quantity plus whether it was reduced.
 */
export const clampCartQuantity = (
  quantity: number,
  unitPrice = 0,
): { quantity: number; clamped: boolean } => {
  const raw = Math.floor(Number(quantity) || 0);
  let safe = Math.min(Math.max(1, raw), MAX_LINE_QUANTITY);
  if (unitPrice > 0) {
    safe = Math.min(safe, Math.max(1, Math.floor(MAX_LINE_VALUE_SAR / unitPrice)));
  }
  return { quantity: safe, clamped: safe < raw };
};

export const gatewayLimitMessage = (isRTL: boolean) =>
  isRTL
    ? `إجمالي الطلب يتجاوز حد الدفع الإلكتروني (${MAX_GATEWAY_AMOUNT_SAR.toLocaleString("en-US")} ﷼). يرجى تقليل الكميات أو تقسيم الطلب، أو طلب عرض سعر للكميات الكبيرة.`
    : `Order total exceeds the online payment limit (SAR ${MAX_GATEWAY_AMOUNT_SAR.toLocaleString("en-US")}). Please reduce quantities or split the order — for bulk volumes, request a quote (RFQ).`;
