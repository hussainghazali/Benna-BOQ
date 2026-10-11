const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROXY_BASE = `${SUPABASE_URL}/functions/v1/benna-catalog-proxy`;
const PRODUCTS_URL = `${PROXY_BASE}?file=products`;
const CATEGORIES_URL = `${PROXY_BASE}?file=categories`;
const CACHE_NAME = "benna-catalog-cache-v2";

type MongoId = string | { $oid?: string } | undefined | null;

export interface CatalogCategory {
  id: string;
  wixCategoryId: string;
  categoryNameEnglish: string;
  categoryNameArabic: string;
  thumbnailURL: string;
  imageURL: string;
  numberOfProducts: number;
  slug: string;
  active: boolean;
}

export interface CatalogProduct {
  _id: string;
  name: string;
  nameArabic?: string;
  description?: string;
  uniqueProductSlug: string;
  productImageUrl: string;
  collections: string;
  sku: string;
  ribbon?: string;
  price: number;
  discountMode?: "PERCENT" | "FIXED";
  discountValue?: number;
  visible: boolean;
  inventory?: string;
  inventoryTracking?: {
    trackInventory?: boolean;
    quantity?: number;
  };
  brand: string;
  brandLogoUrl?: string;
  status: string;
  uploadedByVendorId: string;
  isRFQ?: boolean;
  categoryNameEnglish: string;
  categoryNameArabic?: string;
  searchText: string;
  searchTokens: string[];
}

export interface BOQCatalogItem {
  category: string;
  item: string;
  brand?: string;
}

export interface CatalogRecommendation {
  product: CatalogProduct;
  matchedItem: string;
  matchedCategory: string;
  reason: string;
  score: number;
}

export interface BOQRecommendationResult {
  featuredProducts: CatalogRecommendation[];
  matchedItemsCount: number;
  totalItemsCount: number;
}

interface CatalogData {
  products: CatalogProduct[];
  categories: CatalogCategory[];
}

let catalogPromise: Promise<CatalogData> | null = null;

const readMongoId = (value: MongoId): string => {
  if (!value) return "";
  return typeof value === "string" ? value : String(value.$oid || "");
};

const normalize = (value: string | undefined | null): string =>
  String(value || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string | undefined | null): string[] =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 1);

const dedupe = <T>(items: T[]): T[] => Array.from(new Set(items));

const sanitizeText = (value: unknown): string => String(value || "").trim();

const fetchJsonWithCache = async <T>(url: string): Promise<T> => {
  if (typeof window !== "undefined" && "caches" in window) {
    const cache = await window.caches.open(CACHE_NAME);
    const cached = await cache.match(url);

    if (cached) {
      return cached.json() as Promise<T>;
    }

    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`Failed to load catalog asset: ${response.status}`);
    }

    await cache.put(url, response.clone());
    return response.json() as Promise<T>;
  }

  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) {
    throw new Error(`Failed to load catalog asset: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

const buildCategoryMaps = (categories: CatalogCategory[]) => {
  const byEnglish = new Map<string, CatalogCategory>();
  const bySlug = new Map<string, CatalogCategory>();

  categories.forEach((category) => {
    byEnglish.set(normalize(category.categoryNameEnglish), category);
    bySlug.set(normalize(category.slug), category);
  });

  return { byEnglish, bySlug };
};

const mapCategory = (raw: any): CatalogCategory => ({
  id: readMongoId(raw?._id),
  wixCategoryId: sanitizeText(raw?.wixCategoryId),
  categoryNameEnglish: sanitizeText(raw?.categoryNameEnglish),
  categoryNameArabic: sanitizeText(raw?.categoryNameArabic),
  thumbnailURL: sanitizeText(raw?.thumbnailURL),
  imageURL: sanitizeText(raw?.imageURL),
  numberOfProducts: Number(raw?.numberOfProducts || 0),
  slug: sanitizeText(raw?.slug),
  active: Boolean(raw?.active),
});

const mapProduct = (
  raw: any,
  categoryMaps: ReturnType<typeof buildCategoryMaps>,
): CatalogProduct | null => {
  const id = readMongoId(raw?._id);
  const name = sanitizeText(raw?.name);
  const uniqueProductSlug = sanitizeText(
    raw?.uniqueProductSlug || raw?.handleId || id,
  );
  const uploadedByVendorId = sanitizeText(raw?.uploadedByVendorId);

  if (!id || !name || !uniqueProductSlug || !uploadedByVendorId) {
    return null;
  }

  const collections = sanitizeText(raw?.collections);
  const mappedCategory =
    categoryMaps.byEnglish.get(normalize(collections)) ||
    categoryMaps.bySlug.get(normalize(collections));

  const categoryNameEnglish =
    sanitizeText(raw?.categoryNameEnglish) ||
    mappedCategory?.categoryNameEnglish ||
    collections ||
    "General";

  const categoryNameArabic =
    sanitizeText(raw?.categoryNameArabic) ||
    mappedCategory?.categoryNameArabic ||
    "";

  const searchParts = [
    name,
    raw?.nameArabic,
    raw?.brand,
    raw?.sku,
    collections,
    categoryNameEnglish,
    categoryNameArabic,
    raw?.description,
    raw?.descriptionArabic,
    raw?.ribbon,
    uniqueProductSlug,
  ];

  return {
    _id: id,
    name,
    nameArabic: sanitizeText(raw?.nameArabic),
    description: sanitizeText(raw?.description),
    uniqueProductSlug,
    productImageUrl: sanitizeText(raw?.productImageUrl),
    collections,
    sku: sanitizeText(raw?.sku),
    ribbon: sanitizeText(raw?.ribbon),
    price: Number(raw?.price || 0),
    discountMode: raw?.discountMode,
    discountValue: Number(raw?.discountValue || 0),
    visible: raw?.visible !== false,
    inventory: sanitizeText(raw?.inventory),
    inventoryTracking: raw?.inventoryTracking,
    brand: sanitizeText(raw?.brand),
    brandLogoUrl: sanitizeText(raw?.brandLogoUrl),
    status: sanitizeText(raw?.status),
    uploadedByVendorId,
    isRFQ: Boolean(raw?.isRFQ),
    categoryNameEnglish,
    categoryNameArabic,
    searchText: normalize(searchParts.join(" ")),
    searchTokens: dedupe(tokenize(searchParts.join(" "))),
  };
};

export const loadBennaCatalog = async (): Promise<CatalogData> => {
  if (!catalogPromise) {
    catalogPromise = Promise.all([
      fetchJsonWithCache<any[]>(PRODUCTS_URL),
      fetchJsonWithCache<any[]>(CATEGORIES_URL),
    ]).then(([rawProducts, rawCategories]) => {
      const categories = rawCategories
        .map(mapCategory)
        .filter((category) => category.active);
      const categoryMaps = buildCategoryMaps(categories);

      const products = rawProducts
        .map((raw) => mapProduct(raw, categoryMaps))
        .filter((product): product is CatalogProduct => Boolean(product))
        .filter(
          (product) =>
            product.visible && product.status === "published" && !product.isRFQ,
        );

      return { products, categories };
    });
  }

  return catalogPromise;
};

const computeScore = (
  boqItem: BOQCatalogItem,
  product: CatalogProduct,
): number => {
  const itemText = normalize(boqItem.item);
  const categoryText = normalize(boqItem.category);
  const brandText = normalize(boqItem.brand);
  const tokens = dedupe(
    tokenize(`${boqItem.item} ${boqItem.category} ${boqItem.brand || ""}`),
  );

  let score = 0;

  if (!itemText && !categoryText && tokens.length === 0) return score;

  if (itemText && product.searchText.includes(itemText)) score += 42;
  if (categoryText && product.searchText.includes(categoryText)) score += 18;
  if (brandText && normalize(product.brand) === brandText) score += 30;
  if (brandText && product.searchText.includes(brandText)) score += 12;

  tokens.forEach((token) => {
    if (product.searchTokens.includes(token)) {
      score += token.length > 4 ? 8 : 4;
    }
  });

  if (normalize(product.categoryNameEnglish) === categoryText) score += 22;
  if (normalize(product.collections) === categoryText) score += 16;
  if (product.inventory === "InStock") score += 8;
  if (
    product.inventoryTracking?.trackInventory &&
    (product.inventoryTracking.quantity || 0) > 0
  ) {
    score += 6;
  }
  if (product.price > 0) score += 2;

  return score;
};

const buildReason = (
  boqItem: BOQCatalogItem,
  product: CatalogProduct,
): string => {
  const reasons = [product.categoryNameEnglish];
  if (boqItem.brand && normalize(boqItem.brand) === normalize(product.brand)) {
    reasons.push(product.brand);
  } else if (product.brand) {
    reasons.push(product.brand);
  }

  return reasons.filter(Boolean).slice(0, 2).join(" • ");
};

export const generateBOQRecommendations = (
  boqItems: BOQCatalogItem[],
  products: CatalogProduct[],
  limit = 8,
): BOQRecommendationResult => {
  const featuredMap = new Map<string, CatalogRecommendation>();
  let matchedItemsCount = 0;

  boqItems.forEach((boqItem) => {
    const ranked = products
      .map((product) => ({ product, score: computeScore(boqItem, product) }))
      .filter((entry) => entry.score >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    if (ranked.length > 0) matchedItemsCount += 1;

    ranked.forEach(({ product, score }) => {
      const existing = featuredMap.get(product._id);
      if (existing && existing.score >= score) return;

      featuredMap.set(product._id, {
        product,
        matchedItem: boqItem.item,
        matchedCategory: boqItem.category,
        reason: buildReason(boqItem, product),
        score,
      });
    });
  });

  const featuredProducts = Array.from(featuredMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    featuredProducts,
    matchedItemsCount,
    totalItemsCount: boqItems.length,
  };
};
