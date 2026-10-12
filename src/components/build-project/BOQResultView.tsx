// src/components/build-project/BOQResultView.tsx
import { locNum } from "@/utils/formatPrice";
import { useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import BOQRecommendationsPanel from "@/components/build-project/BOQRecommendationsPanel";
import BOQFeedbackPanel from "@/components/build-project/BOQFeedbackPanel";
import { useBennaCatalogRecommendations } from "@/hooks/useBennaCatalogRecommendations";
import {
  Download,
  ShoppingCart,
  RotateCcw,
  Clock,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Package,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildCartProduct } from "@/lib/boq-recommendations";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { logBoqCatalogGaps } from "@/lib/boq-gap-logger";
import { getCurrentUserId } from "@/lib/auth-session";

interface BOQItem {
  category: string;
  item: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  brand?: string;
}

interface BOQResult {
  items: BOQItem[];
  totalEstimatedCost: number;
  timeline: string;
  notes: string[];
}

interface Props {
  result: BOQResult;
  projectName: string;
  projectType?: string;
  city?: string;
  areaSqm?: number;
  floors?: number;
  projectId?: string; // NEW: Added for gap logging
  onReset: () => void;
}

const BOQResultView = ({
  result,
  projectName,
  projectType = "",
  city = "",
  areaSqm = 0,
  floors = 1,
  projectId,
  onReset,
}: Props) => {
  const { isRTL } = useLanguage();
  const { addToCart } = useCart();
  const { recommendations, isLoading, error } = useBennaCatalogRecommendations(
    result.items.map((item) => ({
      category: item.category,
      item: item.item,
      brand: item.brand,
    })),
  );

  // Fire-and-forget: log unmatched BOQ items to backend
  const loggedRef = useRef(false);
  useEffect(() => {
    if (loggedRef.current) return;
    if (isLoading) return;
    if (!result?.items?.length) return;

    loggedRef.current = true;
    logBoqCatalogGaps({
      customerId: getCurrentUserId(),
      projectId, // FIXED: Now passed through
      projectName,
      projectType,
      city,
      areaSqm,
      floors,
      items: result.items,
      recommendations,
    });
  }, [isLoading]); // FIXED: Minimal dependency array to prevent re-runs

  const grouped = result.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, BOQItem[]>,
  );

  // FIXED: Proper CSV escaping to prevent injection
  const escapeCSV = useCallback((value: string | number): string => {
    const str = String(value);
    // If contains quotes, commas, or newlines, wrap in quotes and escape inner quotes
    if (
      str.includes('"') ||
      str.includes(",") ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = [
      "Category",
      "Item",
      "Unit",
      "Quantity",
      "Unit Price (SAR)",
      "Total (SAR)",
      "Brand",
    ];
    const rows = result.items.map((i) => [
      escapeCSV(i.category),
      escapeCSV(i.item),
      escapeCSV(i.unit),
      i.quantity,
      i.unitPrice,
      i.totalPrice,
      escapeCSV(i.brand || ""),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      `"TOTAL","","","","",${result.totalEstimatedCost},""`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOQ-${projectName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, "-").replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(isRTL ? "تم تصدير CSV بنجاح" : "CSV exported successfully");
  }, [result, projectName, isRTL, escapeCSV]);

  const handleAddAllMaterials = useCallback(async () => {
    if (recommendations.featuredProducts.length === 0) {
      toast.warning(
        isRTL ? "لا توجد مواد مطابقة" : "No matched materials available",
      );
      return;
    }

    let added = 0;
    let failed = 0;

    for (const recommendation of recommendations.featuredProducts) {
      try {
        const success = await addToCart(buildCartProduct(recommendation));
        if (success) added += 1;
        else failed += 1;
      } catch (err) {
        failed += 1;
        console.error("Add to cart error:", err);
      }
    }

    if (added > 0) {
      toast.success(
        isRTL
          ? `تمت إضافة ${added} مواد مرتبطة بالمشروع إلى السلة`
          : `${added} matched project materials added to cart`,
      );
    }
    if (failed > 0) {
      toast.warning(
        isRTL
          ? `فشل إضافة ${failed} مواد`
          : `Failed to add ${failed} materials`,
      );
    }
  }, [recommendations, addToCart, isRTL]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* ── Sunburst success header ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-[6px]"
        style={{
          background: "linear-gradient(90deg, rgb(114,50,241) 3.13%, rgb(251,118,250) 50%, rgb(255,207,94))",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(circle at 15% 50%, rgb(127,125,252) 0%, transparent 60%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full blur-2xl opacity-30"
          style={{ background: "rgb(255,46,222)" }}
        />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-[4px] px-3 py-1">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-light text-white">
                {isRTL ? "تم التوليد بنجاح" : "Generated successfully"}
              </span>
            </div>
          </div>
          <h2
            className="text-white mb-1"
            style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 300, lineHeight: 1.15, letterSpacing: "-0.02em" }}
          >
            {projectName}
          </h2>
          <p className="text-white/75 mb-5" style={{ fontSize: "14px", fontWeight: 300 }}>
            {isRTL ? "قائمة الكميات المقدرة" : "Estimated Bill of Quantities"}
          </p>
          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: isRTL ? "النوع" : "Type", val: projectType },
              { label: isRTL ? "المدينة" : "City", val: city },
              { label: isRTL ? "المساحة" : "Area", val: `${areaSqm} m²` },
              { label: isRTL ? "الأدوار" : "Floors", val: String(floors) },
            ].filter(p => p.val).map((p) => (
              <div key={p.label} className="flex items-center gap-1 bg-white/15 backdrop-blur-sm border border-white/25 rounded-[4px] px-2.5 py-1">
                <span className="text-white/60 text-[11px] font-light">{p.label}:</span>
                <span className="text-white text-[11px] font-light capitalize">{p.val}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: TrendingUp,
            label: isRTL ? "التكلفة التقديرية" : "Estimated Cost",
            value: `﷼ ${locNum(result.totalEstimatedCost)}`,
            accent: true,
          },
          {
            icon: Package,
            label: isRTL ? "عدد المواد" : "Total Items",
            value: String(result.items.length),
            accent: false,
          },
          {
            icon: Clock,
            label: isRTL ? "المدة المتوقعة" : "Timeline",
            value: result.timeline,
            accent: false,
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-white rounded-[6px] p-5 text-center border border-[#d8d6df]"
              style={{ boxShadow: "rgba(23,23,23,0.06) 0px 3px 6px 0px" }}
            >
              <div className="w-9 h-9 rounded-[4px] bg-[#e5edf5] flex items-center justify-center mx-auto mb-3">
                <Icon className="w-4.5 h-4.5 text-[#FF6600]" />
              </div>
              <p className="text-[11px] font-light text-[#64748d] mb-1 uppercase tracking-wider">
                {card.label}
              </p>
              <p
                className={card.accent ? "text-[#FF6600]" : "text-[#061b31]"}
                style={{ fontSize: "20px", fontWeight: 300 }}
              >
                {card.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* BOQ Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-[6px] border border-[#d8d6df] overflow-hidden"
        style={{ boxShadow: "rgba(23,23,23,0.06) 0px 3px 6px 0px" }}
      >
        {/* Table header strip */}
        <div className="bg-[#f8fafd] border-b border-[#d8d6df] px-5 py-3 flex items-center gap-2">
          <div className="w-1 h-4 bg-[#FF6600] rounded-full" />
          <span className="text-[13px] font-light text-[#061b31]">
            {isRTL ? "قائمة الكميات التفصيلية" : "Detailed Bill of Quantities"}
          </span>
          <span className="ml-auto text-[11px] font-light text-[#64748d]">
            {result.items.length} {isRTL ? "بند" : "items"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ background: "linear-gradient(90deg, #FF6600, #E65C00)" }}>
                <TableHead className="font-light text-white text-[12px]">
                  {isRTL ? "المادة" : "Item"}
                </TableHead>
                <TableHead className="font-light text-white text-[12px]">
                  {isRTL ? "الوحدة" : "Unit"}
                </TableHead>
                <TableHead className="font-light text-white text-center text-[12px]">
                  {isRTL ? "الكمية" : "Qty"}
                </TableHead>
                <TableHead className="font-light text-white text-right text-[12px]">
                  {isRTL ? "سعر الوحدة" : "Unit Price"}
                </TableHead>
                <TableHead className="font-light text-white text-right text-[12px]">
                  {isRTL ? "الإجمالي" : "Total"}
                </TableHead>
                <TableHead className="font-light text-white text-[12px]">
                  {isRTL ? "العلامة" : "Brand"}
                </TableHead>
                <TableHead className="font-light text-white text-center text-[12px]">
                  {isRTL ? "ملاحظات" : "Feedback"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(grouped).map(([category, items]) => (
                <>
                  <TableRow key={`cat-${category}`} className="bg-[#f8fafd]">
                    <TableCell
                      colSpan={7}
                      className="py-2.5 border-b border-[#d8d6df]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-0.5 h-4 bg-[#FF6600] rounded-full shrink-0" />
                        <span className="text-[13px] font-light text-[#061b31]">{category}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {items.map((item, idx) => (
                    <TableRow
                      key={`${category}-${idx}`}
                      className="hover:bg-[#f8fafd] transition-colors"
                    >
                      <TableCell className="text-sm text-[#061b31] border-b border-[#d8d6df] font-light">
                        {item.item}
                      </TableCell>
                      <TableCell className="text-sm text-[#50617a] border-b border-[#d8d6df] font-light">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-sm text-[#061b31] text-center border-b border-[#d8d6df] font-light">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-sm text-[#061b31] text-right border-b border-[#d8d6df] font-light">
                        ﷼ {locNum(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-sm text-[#061b31] text-right font-light border-b border-[#d8d6df]">
                        ﷼ {locNum(item.totalPrice)}
                      </TableCell>
                      <TableCell className="border-b border-[#d8d6df]">
                        {item.brand && (
                          <Badge className="bg-[#FF6600] text-white hover:bg-[#FF6600] font-light">
                            {item.brand}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="border-b border-[#d8d6df] text-center">
                        <BOQFeedbackPanel
                          boqItemId={`${category}-${idx}`}
                          category={category}
                          item={item.item}
                          originalQuantity={item.quantity}
                          originalUnitPrice={item.unitPrice}
                          projectName={projectName}
                          projectType={projectType}
                          city={city}
                          areaSqm={areaSqm}
                          floors={floors}
                          projectId={projectId}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
              <TableRow style={{ background: "linear-gradient(90deg, #FF6600, #E65C00)" }}>
                <TableCell
                  colSpan={5}
                  className="text-right text-[13px] font-light text-white"
                >
                  {isRTL ? "الإجمالي الكلي" : "Grand Total"}
                </TableCell>
                <TableCell className="text-[16px] font-light text-white text-right">
                  ﷼ {locNum(result.totalEstimatedCost)}
                </TableCell>
                <TableCell colSpan={1} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Notes */}
      {result.notes && result.notes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-[#e5edf5] border border-[#d8d6df] rounded-[4px] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#FF6600]" />
            <h3 className="font-light text-[#061b31]">
              {isRTL ? "ملاحظات مهمة" : "Important Notes"}
            </h3>
          </div>
          <ul className="space-y-1">
            {result.notes.map((note, i) => (
              <li
                key={i}
                className="text-sm text-[#50617a] flex gap-2 font-light"
              >
                <span>•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Recommendations Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
      >
        <BOQRecommendationsPanel
          recommendations={recommendations.featuredProducts}
          matchedItemsCount={recommendations.matchedItemsCount}
          totalItemsCount={recommendations.totalItemsCount}
          isLoading={isLoading}
          error={error}
          onAddAll={handleAddAllMaterials}
        />
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-[#f8fafd] rounded-[6px] border border-[#d8d6df] p-4"
        style={{ boxShadow: "rgba(50,50,93,0.12) 0px 16px 32px 0px" }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 h-11 rounded-[4px] border border-[#d8d6df] hover:border-[#FF6600] hover:bg-white text-[#061b31] font-light text-[14px]"
          >
            <Download className="w-4 h-4" />
            {isRTL ? "تصدير CSV" : "Export CSV"}
          </Button>
          <Button
            variant="ghost"
            onClick={onReset}
            className="gap-2 h-11 flex-1 rounded-[4px] border border-[#d8d6df] hover:border-[#FF6600] hover:bg-white text-[#061b31] font-light text-[14px]"
          >
            <RotateCcw className="w-4 h-4" />
            {isRTL ? "مشروع جديد" : "New Project"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BOQResultView;
