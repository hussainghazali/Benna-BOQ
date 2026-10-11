// src/hooks/useBennaCatalogRecommendations.ts
import { useEffect, useMemo, useState, useRef } from "react";
import {
  generateBOQRecommendations,
  loadBennaCatalog,
  type BOQCatalogItem,
  type BOQRecommendationResult,
  type CatalogCategory,
} from "@/lib/benna-catalog";

interface State {
  isLoading: boolean;
  error: string | null;
  recommendations: BOQRecommendationResult;
  categories: CatalogCategory[];
}

const emptyRecommendations: BOQRecommendationResult = {
  featuredProducts: [],
  matchedItemsCount: 0,
  totalItemsCount: 0,
};

// Stable comparison helper
const itemsEqual = (a: BOQCatalogItem[], b: BOQCatalogItem[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.category === b[i].category &&
      item.item === b[i].item &&
      item.brand === b[i].brand,
  );
};

export const useBennaCatalogRecommendations = (items: BOQCatalogItem[]) => {
  // Use ref to track previous items for stable comparison
  const prevItemsRef = useRef<BOQCatalogItem[]>([]);
  const [stableItems, setStableItems] = useState<BOQCatalogItem[]>([]);

  // Only update stableItems when items actually change (deep comparison)
  useEffect(() => {
    if (!itemsEqual(items, prevItemsRef.current)) {
      prevItemsRef.current = items;
      setStableItems(items);
    }
  }, [items]);

  const [state, setState] = useState<State>({
    isLoading: stableItems.length > 0,
    error: null,
    recommendations: {
      ...emptyRecommendations,
      totalItemsCount: stableItems.length,
    },
    categories: [],
  });

  useEffect(() => {
    let cancelled = false;

    if (stableItems.length === 0) {
      setState({
        isLoading: false,
        error: null,
        recommendations: emptyRecommendations,
        categories: [],
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      recommendations: {
        ...prev.recommendations,
        totalItemsCount: stableItems.length,
      },
    }));

    loadBennaCatalog()
      .then(({ products, categories }) => {
        if (cancelled) return;

        setState({
          isLoading: false,
          error: null,
          recommendations: generateBOQRecommendations(stableItems, products),
          categories,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setState({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load Benna catalog recommendations.",
          recommendations: {
            ...emptyRecommendations,
            totalItemsCount: stableItems.length,
          },
          categories: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [stableItems]);

  return state;
};
