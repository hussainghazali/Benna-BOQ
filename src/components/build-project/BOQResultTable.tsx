// src/components/build-project/BOQResultTable.tsx
// Full BOQ results table + CSV export.
// Standalone BOQ site: no cart / vendor-chat actions (those live on the store).
import { useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { Download, RotateCcw, Package, AlertTriangle } from "lucide-react";
import { locNum } from "@/utils/formatPrice";
import type { BOQResultV3 } from "@/hooks/useBOQGeneration";
import type { MatchedBOQLine } from "@/lib/boq-engine/matcher";
import { boqActivityApi } from "@/lib/api-boq-activity";


interface Props {
  result: BOQResultV3;
  onReset: () => void;
}

const csvEscape = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const BOQResultTable = ({ result, onReset }: Props) => {
  const { isRTL } = useLanguage();

  const grouped = useMemo(() => {
    const g: Record<string, MatchedBOQLine[]> = {};
    for (const l of result.lines) {
      const key = isRTL ? l.line.categoryAr : l.line.category;
      (g[key] ||= []).push(l);
    }
    return g;
  }, [result.lines, isRTL]);

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
      <div className="border border-[#f0f0f0] rounded-xl bg-white p-5 flex flex-col items-center gap-4 text-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#888888] font-normal">
            {isRTL ? "التكلفة الإجمالية التقديرية" : "Estimated Total"}
          </div>
          <div className="text-3xl font-normal text-[#222222] mt-1">
            ﷼ {locNum(result.totalEstimate)}
          </div>
          <div className="text-xs text-[#888888] mt-1 font-normal">
            {result.lines.length} {isRTL ? "بند" : "items"} · {result.matchedCount} {isRTL ? "مطابق" : "matched"}
            {result.unmatchedCount > 0 && (
              <span className="text-amber-600">
                {" "}· {result.unmatchedCount} {isRTL ? "غير متوفر" : "unmatched"}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" onClick={exportCSV} className="rounded-lg">
            <Download className="w-4 h-4 mr-2" />
            {isRTL ? "تصدير CSV" : "Export CSV"}
          </Button>
          <Button variant="outline" onClick={onReset} className="rounded-lg">
            <RotateCcw className="w-4 h-4 mr-2" />
            {isRTL ? "قائمة جديدة" : "New BOQ"}
          </Button>
        </div>
      </div>

      {/* Grouped tables */}
      {Object.entries(grouped).map(([category, rows]) => (
        <div key={category} className="border border-[#f0f0f0] rounded-xl overflow-hidden bg-white">
          <div className="px-4 py-3 bg-[#f7f7f7] border-b border-[#f0f0f0] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#FF6600]" />
            <span className="text-sm font-normal text-[#222222]">{category}</span>
            <Badge variant="outline" className="ml-auto rounded-lg font-normal">
              {rows.length}
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-normal">{isRTL ? "البند" : "Item"}</TableHead>
                <TableHead className="font-normal">{isRTL ? "الكمية" : "Qty"}</TableHead>
                <TableHead className="font-normal">{isRTL ? "المنتج المطابق" : "Matched Product"}</TableHead>
                <TableHead className="font-normal text-right">{isRTL ? "سعر الوحدة" : "Unit ﷼"}</TableHead>
                <TableHead className="font-normal text-right">{isRTL ? "الإجمالي" : "Total ﷼"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                return (
                  <TableRow key={r.line.id}>
                    <TableCell className="font-normal">
                      <div className="text-[#222222]">{isRTL ? r.line.itemAr : r.line.item}</div>
                      {r.line.wastagePct > 0 && (
                        <div className="text-[10px] text-[#888888]">
                          {isRTL ? `بما في ذلك ${r.line.wastagePct}% هدر` : `incl. ${r.line.wastagePct}% wastage`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-normal whitespace-nowrap">
                      {locNum(r.line.quantity)} {r.line.unit}
                    </TableCell>
                    <TableCell className="font-normal max-w-[280px]">
                      {r.match ? (
                        <div className="flex items-center gap-2">
                          {r.match.imageUrl && (
                            <img
                              src={r.match.imageUrl}
                              alt=""
                              className="w-9 h-9 rounded object-cover border border-[#f0f0f0]"
                              loading="lazy"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs text-[#222222] truncate">{r.match.name}</div>
                            {r.match.brand && (
                              <div className="text-[10px] text-[#888888]">{r.match.brand}</div>
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
                    <TableCell className="font-normal text-right whitespace-nowrap">
                      {r.unitPrice > 0 ? `﷼ ${locNum(r.unitPrice)}` : "—"}
                    </TableCell>
                    <TableCell className="font-normal text-right whitespace-nowrap">
                      {r.lineTotal > 0 ? `﷼ ${locNum(r.lineTotal)}` : "—"}
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
