// Product search used by the BOQ matcher. Prefers Algolia (instant, the same
// public search-only key the real storefront uses) and falls back to the
// backend GET /users/website/search (slow on prod — Mongo text search).
import { liteClient as algoliasearch } from "algoliasearch/lite";
import { apiClient } from "./api-client";

interface SearchResponse {
  data: any[];
}

const ALGOLIA_APP_ID = import.meta.env
  .VITE_ALGOLIA_APP_ID as string | undefined;
const ALGOLIA_SEARCH_KEY = import.meta.env
  .VITE_ALGOLIA_SEARCH_KEY as string | undefined;
const ALGOLIA_INDEX = "products(2)";

const algoliaClient =
  ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY
    ? algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY)
    : null;

const cleanObjectId = (raw: unknown): string => {
  const s = String(raw ?? "");
  const m = s.match(/ObjectId\("?([a-f0-9]{24})"?\)/i);
  return m ? m[1] : s;
};

const toBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase();
  return s === "true" || s === "1" || s === "yes";
};

const mapHit = (hit: any) => {
  const id = cleanObjectId(hit._id ?? hit.objectID);
  const inventory = String(hit.inventory ?? "");
  return {
    _id: id,
    productId: id,
    name: String(hit.name ?? hit.productName ?? ""),
    nameArabic: String(hit.nameArabic ?? hit.productNameArabic ?? ""),
    brand: String(hit.brand ?? hit.brandName ?? ""),
    price: Number(hit.price ?? 0),
    inStock:
      inventory !== "OutOfStock" && inventory !== "0" && inventory !== "",
    inventory,
    productImageUrl: hit.productImageUrl,
    uniqueProductSlug: hit.uniqueProductSlug
      ? String(hit.uniqueProductSlug)
      : undefined,
    isRFQ: toBool(hit.isRFQ),
  };
};

const algoliaSearch = async (
  query: string,
  opts: { limit?: number; page?: number },
): Promise<SearchResponse> => {
  if (!algoliaClient) return { data: [] };
  try {
    const res: any = await algoliaClient.search({
      requests: [
        {
          indexName: ALGOLIA_INDEX,
          query,
          hitsPerPage: opts.limit ?? 8,
          page: (opts.page ?? 1) - 1,
        },
      ],
    });
    const hits = res?.results?.[0]?.hits ?? [];
    return { data: hits.map(mapHit) };
  } catch (err) {
    console.error("[algolia] search failed:", err);
    return { data: [] };
  }
};

export const searchApi = {
  search: async (
    query: string,
    opts: { limit?: number; page?: number } = {},
  ): Promise<SearchResponse> => {
    if (algoliaClient) {
      const res = await algoliaSearch(query, opts);
      if (res.data.length) return res;
      // empty Algolia result → still try backend once? No: Algolia is the
      // catalog source of truth; empty means nothing matched.
      return res;
    }
    const params = new URLSearchParams({
      q: query,
      limit: String(opts.limit ?? 8),
      page: String(opts.page ?? 1),
    });
    try {
      const res = await apiClient<{ data?: any[]; products?: any[] }>(
        `/users/website/search?${params.toString()}`,
      );
      return { data: res.data ?? res.products ?? [] };
    } catch (err) {
      console.error("[searchApi.search] Failed:", err);
      return { data: [] };
    }
  },
};
