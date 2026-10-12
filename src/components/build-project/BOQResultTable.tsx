// src/components/build-project/BOQResultTable.tsx
// Full BOQ results table with Add to Cart per row + Add All + CSV export.
import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Download, RotateCcw, Package, CheckCircle2, AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { locNum } from "@/utils/formatPrice";
import type { BOQResultV3 } from "@/hooks/useBOQGeneration";
import type { MatchedBOQLine, MatchedProduct } from "@/lib/boq-engine/matcher";
import { boqActivityApi } from "@/lib/api-boq-activity";
import { clampCartQuantity } from "@/lib/cart-limits";


interface Props {
  result: BOQResultV3;
  onReset: () => void;
  onOpenFeedback: () => void;
  onOpenChat?: (product: {
    id: string | number;
    name: string;
    vendorId?: string;
    image?: string;
    price?: number;
  }) => void;
}

const csvEscape = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const BOQResultTable = ({ result, onReset, onOpenFeedback, onOpenChat }: Props) => {
  const { isRTL } = useLanguage();
  const { addToCart } = useCart();
  const [addedRows, setAddedRows] = useState<Record<string, boolean>>({});
  const [busyAll, setBusyAll] = useState(false);

  const grouped = useMemo(() => {
    const g: Record<string, MatchedBOQLine[]> = {};
    for (const l of result.lines) {
      const key = isRTL ? l.line.categoryAr : l.line.category;
      (g[key] ||= []).push(l);
    }
    return g;
  }, [result.lines, isRTL]);

  const addRowToCart = useCallback(
    async (row: MatchedBOQLine) => {
      const m: MatchedProduct | null = row.match;
      if (!m || !m.productId) {
        toast.error(isRTL ? "لا يوجد منتج مطابق" : "No matching product to add");
        return;
      }
      if (m.isRFQ) {
        // Defense in depth — the button swaps to "Chat" for RFQ rows, but
        // never let an RFQ-only product reach the cart even if this is
        // ever called some other way.
        toast.info(isRTL ? "هذا المنتج يتطلب طلب عرض سعر عبر الدردشة" : "This product requires a quote via chat");
        return;
      }
      const cap = clampCartQuantity(row.line.quantity, m.price);
      try {
        await addToCart({
          productId: m.productId,
          productName: m.name,
          uniqueProductSlug: m.slug || "",
          productPrice: m.price,
          productQuantity: cap.quantity,
          productImageUrl: m.imageUrl || "",
          vendorId: m.vendorId || "",
        }, { source: "boq" });
        setAddedRows((s) => ({ ...s, [row.line.id]: true }));
        if (cap.clamped) {
          toast.info(
            isRTL
              ? `تم تحديد الكمية بـ ${locNum(cap.quantity)} للشراء الإلكتروني. اطلب عرض سعر للكميات الأكبر.`
              : `Quantity capped at ${locNum(cap.quantity)} for online purchase — request a quote (RFQ) for larger volumes.`,
          );
        }
        boqActivityApi.log({
          boqId: result.boqId,
          event: "add_to_cart_row",
          addedToCartItems: [{ productId: m.productId, quantity: cap.quantity }],
        });
      } catch (e: any) {
        toast.error(e?.message || (isRTL ? "فشل الإضافة" : "Failed to add"));
      }
    },
    [addToCart, isRTL, result.boqId],
  );


  const handleChat = useCallback(
    (row: MatchedBOQLine) => {
      const m: MatchedProduct | null = row.match;
      if (!m || !m.productId) return;
      if (onOpenChat) {
        onOpenChat({
          id: m.productId,
          name: m.name,
          vendorId: m.vendorId,
          image: m.imageUrl,
          price: m.price,
        });
      } else {
        toast.info(isRTL ? "الدردشة غير متوفرة حالياً" : "Chat is unavailable right now");
      }
    },
    [onOpenChat, isRTL],
  );

  const addAllToCart = useCallback(async () => {
    setBusyAll(true);
    const successes: Array<{ productId: string; quantity: number }> = [];
    const skippedRFQ = result.lines.filter((row) => row.match?.isRFQ).length;
    let clampedCount = 0;
    for (const row of result.lines) {
      const m = row.match;
      // RFQ-only products aren't cart-able — they're negotiated via vendor
      // chat, same rule as everywhere else in the storefront.
      if (!m || !m.productId || m.price <= 0 || m.isRFQ) continue;
      const cap = clampCartQuantity(row.line.quantity, m.price);
      if (cap.clamped) clampedCount += 1;
      try {
        await addToCart({
          productId: m.productId,
          productName: m.name,
          uniqueProductSlug: m.slug || "",
          productPrice: m.price,
          productQuantity: cap.quantity,
          productImageUrl: m.imageUrl || "",
          vendorId: m.vendorId || "",
        }, { source: "boq" });
        successes.push({ productId: m.productId, quantity: cap.quantity });
        setAddedRows((s) => ({ ...s, [row.line.id]: true }));
      } catch {
        /* keep going */
      }
    }
    setBusyAll(false);
    toast.success(
      isRTL
        ? `تمت إضافة ${successes.length} منتجًا إلى السلة${skippedRFQ > 0 ? ` (${skippedRFQ} منتج RFQ يتطلب تواصل مع البائع)` : ""}`
        : `${successes.length} products added to cart${skippedRFQ > 0 ? ` (${skippedRFQ} RFQ item${skippedRFQ !== 1 ? "s" : ""} need vendor chat)` : ""}`,
    );
    if (clampedCount > 0) {
      toast.info(
        isRTL
          ? `تم تحديد كميات ${clampedCount} بند للشراء الإلكتروني. اطلب عرض سعر للكميات الكبيرة.`
          : `${clampedCount} line item${clampedCount !== 1 ? "s were" : " was"} capped for online purchase — request a quote (RFQ) for bulk volumes.`,
      );
    }

    boqActivityApi.log({
      boqId: result.boqId,
      event: "add_all_to_cart",
      addedToCartItems: successes,
    });
    // Prompt feedback after a beat
    setTimeout(onOpenFeedback, 800);
  }, [addToCart, result, isRTL, onOpenFeedback]);

  const exportCSV = useCallback(() => {
    const rows = [
      ["Category", "Item", "Qty", "Unit", "Matched Product", "Unit Price (SAR)", "Line Total (SAR)"],
      ...result.lines.map((r) => [
        r.line.category,
        r.line.item,
        r.line.quantity,
        r.line.unit,
        r.match?.name || "—",
        r.unitPrice,
        r.lineTotal,
      ]),
      ["", "", "", "", "TOTAL", "", result.totalEstimate],
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.input.projectName || "boq"}-${result.boqId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    boqActivityApi.log({ boqId: result.boqId, event: "csv_export" });
  }, [result]);

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Summary bar */}
      <div className="border border-[#e5edf5] rounded-[6px] bg-white p-5 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#64748d] font-light">
            {isRTL ? "التكلفة الإجمالية التقديرية" : "Estimated Total"}
          </div>
          <div className="text-3xl font-light text-[#061b31] mt-1">
            ﷼ {locNum(result.totalEstimate)}
          </div>
          <div className="text-xs text-[#64748d] mt-1 font-light">
            {result.lines.length} {isRTL ? "بند" : "items"} · {result.matchedCount} {isRTL ? "مطابق" : "matched"}
            {result.unmatchedCount > 0 && (
              <span className="text-amber-600">
                {" "}· {result.unmatchedCount} {isRTL ? "غير متوفر" : "unmatched"}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportCSV} className="rounded-[4px]">
            <Download className="w-4 h-4 mr-2" />
            {isRTL ? "تصدير CSV" : "Export CSV"}
          </Button>
          <Button variant="outline" onClick={onReset} className="rounded-[4px]">
            <RotateCcw className="w-4 h-4 mr-2" />
            {isRTL ? "قائمة جديدة" : "New BOQ"}
          </Button>
        </div>
      </div>

      {/* Grouped tables */}
      {Object.entries(grouped).map(([category, rows]) => (
        <div key={category} className="border border-[#e5edf5] rounded-[6px] overflow-hidden bg-white">
          <div className="px-4 py-3 bg-[#f8fafd] border-b border-[#e5edf5] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#FA6400]" />
            <span className="text-sm font-light text-[#061b31]">{category}</span>
            <Badge variant="outline" className="ml-auto rounded-[4px] font-light">
              {rows.length}
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-light">{isRTL ? "البند" : "Item"}</TableHead>
                <TableHead className="font-light">{isRTL ? "الكمية" : "Qty"}</TableHead>
                <TableHead className="font-light">{isRTL ? "المنتج المطابق" : "Matched Product"}</TableHead>
                <TableHead className="font-light text-right">{isRTL ? "سعر الوحدة" : "Unit ﷼"}</TableHead>
                <TableHead className="font-light text-right">{isRTL ? "الإجمالي" : "Total ﷼"}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const added = addedRows[r.line.id];
                return (
                  <TableRow key={r.line.id}>
                    <TableCell className="font-light">
                      <div className="text-[#061b31]">{isRTL ? r.line.itemAr : r.line.item}</div>
                      {r.line.wastagePct > 0 && (
                        <div className="text-[10px] text-[#64748d]">
                          {isRTL ? `بما في ذلك ${r.line.wastagePct}% هدر` : `incl. ${r.line.wastagePct}% wastage`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-light whitespace-nowrap">
                      {locNum(r.line.quantity)} {r.line.unit}
                    </TableCell>
                    <TableCell className="font-light max-w-[280px]">
                      {r.match ? (
                        <div className="flex items-center gap-2">
                          {r.match.imageUrl && (
                            <img
                              src={r.match.imageUrl}
                              alt=""
                              className="w-9 h-9 rounded object-cover border border-[#e5edf5]"
                              loading="lazy"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs text-[#061b31] truncate">{r.match.name}</div>
                            {r.match.brand && (
                              <div className="text-[10px] text-[#64748d]">{r.match.brand}</div>
                            )}
                            {r.match.isRFQ && (
                              <span className="inline-block mt-0.5 text-[9px] font-bold text-white uppercase tracking-wide bg-primary px-1.5 py-0.5 rounded">
                                RFQ
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          {isRTL ? "غير متوفر" : "Not in catalog"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-light text-right whitespace-nowrap">
                      {r.unitPrice > 0 ? `﷼ ${locNum(r.unitPrice)}` : "—"}
                    </TableCell>
                    <TableCell className="font-light text-right whitespace-nowrap">
                      {r.lineTotal > 0 ? `﷼ ${locNum(r.lineTotal)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.match?.isRFQ ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChat(r)}
                          className="rounded-[4px] border-[#FA6400] text-[#FA6400] hover:bg-[#FA6400] hover:text-white"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" />
                          {isRTL ? "دردشة" : "Chat"}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}

    </div>
  );
};

export default BOQResultTable;
