import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  boqCount: number;
  productName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shown when a shopper adds a normal storefront product while the cart still
 * holds BOQ-generated line items. Confirming wipes the whole cart first so the
 * BOQ package is never partially mixed with ad-hoc items.
 */
const BOQCartConflictDialog = ({
  open,
  boqCount,
  productName,
  onConfirm,
  onCancel,
}: Props) => {
  const { language } = useLanguage();
  const isRTL = language === "ar";

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="rounded-xl border-[#F4F4F4]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 font-normal text-[#222222]">
            <AlertTriangle className="h-5 w-5 text-[#FF6600]" />
            {isRTL ? "سلتك تحتوي على بنود BOQ" : "Your cart holds BOQ items"}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-normal text-[#666666]">
            {isRTL
              ? `تحتوي سلتك حالياً على ${boqCount} بند من جدول الكميات (BOQ). بإضافة ${productName ? `"${productName}"` : "هذا المنتج"} سيتم إفراغ السلة بالكامل من بنود BOQ ثم إضافة المنتج الجديد. هل تريد المتابعة؟`
              : `Your cart currently has ${boqCount} BOQ line item${boqCount !== 1 ? "s" : ""}. Adding ${productName ? `"${productName}"` : "this product"} will clear your entire BOQ cart first, then add the new item. Continue?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            className="rounded-lg font-normal"
          >
            {isRTL ? "الاحتفاظ ببنود BOQ" : "Keep BOQ items"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-lg bg-[#FF6600] font-semibold hover:bg-[#E65C00]"
          >
            {isRTL ? "إفراغ السلة والإضافة" : "Clear cart & add item"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BOQCartConflictDialog;
