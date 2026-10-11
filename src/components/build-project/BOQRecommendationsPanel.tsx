// src/components/build-project/BOQRecommendationsPanel.tsx
import { locNum } from "@/utils/formatPrice";
import { useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  PackageCheck,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import type { CatalogRecommendation } from "@/lib/benna-catalog";
import {
  buildCartProduct,
  getDiscountedPrice,
} from "@/lib/boq-recommendations";
import { getProductImage } from "@/utils/imageUtils";

interface Props {
  recommendations: CatalogRecommendation[];
  matchedItemsCount: number;
  totalItemsCount: number;
  isLoading: boolean;
  error: string | null;
  onAddAll?: () => Promise<void>;
}

const BOQRecommendationsPanel = ({
  recommendations,
  matchedItemsCount,
  totalItemsCount,
  isLoading,
  error,
  onAddAll,
}: Props) => {
  const { isRTL } = useLanguage();
  const { addToCart } = useCart();
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const coverageLabel = useMemo(() => {
    if (!totalItemsCount) return "0/0";
    return `${matchedItemsCount}/${totalItemsCount}`;
  }, [matchedItemsCount, totalItemsCount]);

  const addSingle = useCallback(
    async (recommendation: CatalogRecommendation) => {
      const productId = recommendation.product?._id;
      if (!productId) {
        toast.error(isRTL ? "معرف المنتج غير صالح" : "Invalid product ID");
        return;
      }

      setAddingIds((prev) => new Set(prev).add(productId));
      try {
        const cartProduct = buildCartProduct(recommendation);
        const success = await addToCart(cartProduct);
        if (success) {
          toast.success(
            isRTL ? "تمت إضافة المنتج إلى السلة" : "Product added to cart",
          );
        }
      } catch (err) {
        console.error("Add to cart error:", err);
        toast.error(isRTL ? "فشل إضافة المنتج" : "Failed to add product");
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [addToCart, isRTL],
  );

  const addAll = useCallback(async () => {
    if (recommendations.length === 0) return;

    setIsAddingAll(true);
    let added = 0;
    let failed = 0;

    try {
      if (onAddAll) {
        await onAddAll();
        return;
      }

      // Add sequentially to avoid race conditions in cart
      for (const recommendation of recommendations) {
        try {
          const cartProduct = buildCartProduct(recommendation);
          const success = await addToCart(cartProduct);
          if (success) {
            added += 1;
          } else {
            failed += 1;
          }
        } catch (err) {
          failed += 1;
          console.error("Failed to add item:", err);
        }
      }

      if (added > 0) {
        toast.success(
          isRTL
            ? `تمت إضافة ${added} منتجات موصى بها إلى السلة`
            : `${added} recommended products added to cart`,
        );
      }
      if (failed > 0) {
        toast.warning(
          isRTL
            ? `فشل إضافة ${failed} منتجات`
            : `Failed to add ${failed} products`,
        );
      }
    } finally {
      setIsAddingAll(false);
    }
  }, [recommendations, onAddAll, addToCart, isRTL]);

  const slideCards = useCallback((direction: "prev" | "next") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const amount = Math.min(scroller.clientWidth * 0.85, 640);
    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }, []);

  // Helper function to format discount text
  const getDiscountText = useCallback(
    (discountMode: string | undefined, discountValue: number | undefined) => {
      if (!discountValue || discountValue <= 0) return null;
      if (discountMode === "PERCENT") {
        return `${discountValue}% OFF`;
      }
      if (discountMode === "FIXED") {
        return `${discountValue} SAR OFF`;
      }
      return null;
    },
    [],
  );

  return (
    <Card className="border border-[#d8d6df] shadow-sm rounded-[4px] overflow-hidden">
      <CardHeader className="pb-4 bg-[#f8fafd] border-b border-[#d8d6df]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-[4px] bg-[#533afd] px-3 py-1 text-xs font-light text-white">
              <Sparkles className="h-3.5 w-3.5" />
              {isRTL
                ? "Benna AI ترشيحات قابلة للشراء"
                : "Benna AI shoppable picks"}
            </div>
            <CardTitle className="text-lg sm:text-xl font-light text-[#061b31]">
              {isRTL
                ? "منتجات حقيقية من Benna مرتبطة بقائمة الكميات"
                : "Real Benna products mapped to your BOQ"}
            </CardTitle>
            <p className="text-sm text-[#50617a] font-light">
              {isRTL
                ? "مطابقة مباشرة من كتالوج Benna الفعلي لتسهيل تجهيز المواد وإضافتها للسلة."
                : "Directly matched from the live Benna catalog so your materials are ready to purchase."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1 rounded-[4px] px-3 py-1 bg-[#533afd] text-white hover:bg-[#533afd] font-light border-0">
              <PackageCheck className="h-3.5 w-3.5" />
              {isRTL ? `تغطية ${coverageLabel}` : `Coverage ${coverageLabel}`}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {error ? (
          <Alert
            variant="destructive"
            className="border-[#d8d6df] bg-[#f8fafd]"
          >
            <AlertCircle className="h-4 w-4 text-[#533afd]" />
            <AlertTitle className="text-[#061b31] font-light">
              {isRTL ? "تعذر تحميل التوصيات" : "Recommendations unavailable"}
            </AlertTitle>
            <AlertDescription className="text-[#50617a] font-light">
              {isRTL
                ? "تم توليد BOQ بنجاح لكن تعذر تحميل كتالوج Benna حالياً."
                : "The BOQ was generated successfully, but the Benna catalog could not be loaded right now."}
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[4px] border border-[#d8d6df] p-4 bg-white"
              >
                <Skeleton className="mb-4 aspect-square w-full rounded-[4px] bg-[#f8fafd]" />
                <Skeleton className="mb-2 h-4 w-2/3 bg-[#f8fafd]" />
                <Skeleton className="mb-2 h-4 w-full bg-[#f8fafd]" />
                <Skeleton className="h-10 w-full rounded-[4px] bg-[#f8fafd]" />
              </div>
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => slideCards("prev")}
              className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-[4px] bg-white border border-[#d8d6df] shadow-sm hover:border-[#533afd] hover:bg-[#f8fafd] md:inline-flex"
              aria-label={isRTL ? "السابق" : "Previous recommendations"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div
              ref={scrollerRef}
              className="flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 [scrollbar-width:thin]"
            >
              {recommendations.map((recommendation) => {
                const { product } = recommendation;
                if (!product) return null;

                const isAdding = addingIds.has(product._id);
                const finalPrice = getDiscountedPrice(
                  product.price,
                  product.discountMode,
                  product.discountValue,
                );
                const hasDiscount =
                  product.discountValue && product.discountValue > 0;
                const discountText = getDiscountText(
                  product.discountMode,
                  product.discountValue,
                );

                return (
                  <Card
                    key={product._id}
                    className="w-[280px] min-w-[280px] snap-start overflow-hidden border border-[#d8d6df] rounded-[4px] hover:border-[#533afd] hover:shadow-md transition-all duration-200"
                  >
                    <div className="aspect-square bg-[#f8fafd] p-3 relative">
                      <img
                        src={getProductImage(product.productImageUrl)}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full rounded-[4px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/placeholder-product.png";
                        }}
                      />
                      {hasDiscount && discountText && (
                        <div className="absolute top-2 left-2 bg-[#533afd] text-white text-xs font-light px-2 py-0.5 rounded-[4px]">
                          {discountText}
                        </div>
                      )}
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-light text-[#64748d] uppercase tracking-wider">
                            {product.brand || product.categoryNameEnglish}
                          </p>
                          <Link
                            to={`/product/${product.uniqueProductSlug}`}
                            className="line-clamp-2 text-sm font-light text-[#061b31] hover:text-[#533afd] transition-colors"
                          >
                            {isRTL && product.nameArabic
                              ? product.nameArabic
                              : product.name}
                          </Link>
                        </div>
                        {product.inventory === "InStock" ? (
                          <Badge className="rounded-[4px] bg-[#533afd] text-white hover:bg-[#533afd] font-light border-0">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {isRTL ? "متوفر" : "In stock"}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="space-y-1 rounded-[4px] bg-[#f8fafd] p-3 text-xs border border-[#d8d6df]">
                        <p>
                          <span className="font-light text-[#061b31]">
                            {isRTL ? "مطابق لـ:" : "Matched for:"}
                          </span>{" "}
                          <span className="text-[#50617a]">
                            {recommendation.matchedItem}
                          </span>
                        </p>
                        <p className="text-[#64748d] font-light">
                          {recommendation.reason}
                        </p>
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-xl font-light text-[#061b31]">
                            ﷼ {locNum(finalPrice)}
                          </p>
                          {hasDiscount ? (
                            <p className="text-xs text-[#64748d] line-through">
                              ﷼ {locNum(product.price)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => slideCards("next")}
              className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-[4px] bg-white border border-[#d8d6df] shadow-sm hover:border-[#533afd] hover:bg-[#f8fafd] md:inline-flex"
              aria-label={isRTL ? "التالي" : "Next recommendations"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Alert className="border-[#d8d6df] bg-[#e5edf5]">
            <AlertCircle className="h-4 w-4 text-[#533afd]" />
            <AlertTitle className="text-[#061b31] font-light">
              {isRTL ? "لا توجد مطابقة مباشرة بعد" : "No direct matches yet"}
            </AlertTitle>
            <AlertDescription className="text-[#50617a] font-light">
              {isRTL
                ? "تم إنشاء BOQ لكننا لم نجد منتجات مطابقة بثقة كافية من الكتالوج الحالي."
                : "The BOQ is ready, but we didn't find confident direct matches from the current catalog."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default BOQRecommendationsPanel;
