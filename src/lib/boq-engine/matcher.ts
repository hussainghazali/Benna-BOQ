// src/lib/boq-engine/matcher.ts
// Maps deterministic BOQ lines to real Benna catalog products.
// No AI — uses existing product search API. Multi-category aware.

import { searchApi } from "@/lib/api-search";
import type { BOQLine } from "./index";

export interface MatchedProduct {
  productId: string;
  name: string;
  nameArabic?: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  vendorId?: string;
  slug?: string;
  inStock: boolean;
  isRFQ?: boolean;
  categories?: string[];
}

export interface MatchedBOQLine {
  line: BOQLine;
  match: MatchedProduct | null;
  candidates: MatchedProduct[]; // top 5 alternates
  unitPrice: number;
  lineTotal: number;
  matched: boolean;
}

const pickImage = (p: any): string | undefined => {
  const raw =
    p.productImageUrl ||
    p.imageUrl ||
    p.image ||
    p.thumbnail ||
    (Array.isArray(p.images) ? p.images[0] : undefined);
  if (!raw) return undefined;
  if (typeof raw === "string") return raw.split(";")[0].trim();
  return undefined;
};

const normalize = (p: any): MatchedProduct => ({
  productId: String(p._id ?? p.productId ?? p.id ?? ""),
  name: String(p.productName ?? p.name ?? ""),
  nameArabic: p.productNameArabic ?? p.nameArabic ?? undefined,
  brand: p.brandName ?? p.brand ?? undefined,
  price: Number(p.price ?? p.finalPrice ?? 0),
  imageUrl: pickImage(p),
  vendorId: String(p.uploadedByVendorId ?? p.vendorId ?? ""),
  slug: p.uniqueProductSlug ?? p.slug ?? undefined,
  inStock: p.inventory !== "OutOfStock" && p.inventory !== "0" && p.inStock !== false,
  isRFQ: Boolean(p.isRFQ ?? p.isRfq),
  categories: Array.isArray(p.collections)
    ? p.collections
    : typeof p.collections === "string"
      ? p.collections.split(";").map((s: string) => s.trim())
      : Array.isArray(p.categories)
        ? p.categories
        : undefined,
});

const scoreCandidate = (p: MatchedProduct, keyword: string): number => {
  let s = 0;
  const kw = keyword.toLowerCase();
  const name = (p.name || "").toLowerCase();
  if (name.includes(kw.split(" ")[0])) s += 30;
  for (const w of kw.split(/\s+/)) if (name.includes(w)) s += 6;
  if (p.inStock) s += 20;
  if (!p.isRFQ) s += 10;
  if (p.price > 0) s += 5;
  if (p.imageUrl) s += 3;
  return s;
};

export async function matchBOQLines(
  lines: BOQLine[],
  opts: { concurrency?: number } = {},
): Promise<MatchedBOQLine[]> {
  const concurrency = opts.concurrency ?? 6;
  const results: MatchedBOQLine[] = new Array(lines.length);

  let cursor = 0;
  const workers = new Array(concurrency).fill(0).map(async () => {
    while (cursor < lines.length) {
      const idx = cursor++;
      const line = lines[idx];
      try {
        const res = await searchApi.search(line.searchKeyword, { limit: 8 });
        const candidates = (res.data || []).map(normalize).filter((p) => p.productId);
        // Rank
        candidates.sort((a, b) => scoreCandidate(b, line.searchKeyword) - scoreCandidate(a, line.searchKeyword));
        const match = candidates.find((c) => c.inStock && !c.isRFQ && c.price > 0) || candidates[0] || null;
        const unitPrice = match?.price || 0;
        results[idx] = {
          line,
          match,
          candidates: candidates.slice(0, 5),
          unitPrice,
          lineTotal: unitPrice * line.quantity,
          matched: Boolean(match),
        };
      } catch (e) {
        results[idx] = {
          line,
          match: null,
          candidates: [],
          unitPrice: 0,
          lineTotal: 0,
          matched: false,
        };
      }
    }
  });

  await Promise.all(workers);
  return results;
}
