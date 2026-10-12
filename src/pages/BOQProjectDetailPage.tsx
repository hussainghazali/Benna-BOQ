// src/pages/BOQProjectDetailPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountSidebar from "@/components/AccountSidebar";
import { Button } from "@/components/ui/button";
import { boqApi } from "@/lib/api-boq";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calculator,
  MapPin,
  Layers,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";
import RiyalSymbol from "@/components/ui/RiyalSymbol";

interface BOQItem {
  category?: string;
  item?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  brand?: string;
}

interface BOQProject {
  _id: string;
  customerId: string;
  projectName: string;
  projectType: string;
  city: string;
  areaSqm: number;
  floors: number;
  specifications?: Record<string, any>;
  boqResult?: {
    items?: BOQItem[];
    totalEstimatedCost?: number;
    timeline?: string;
    notes?: string[];
  } | null;
  estimatedCost?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const isValidObjectId = (id: string | undefined): id is string =>
  !!id && /^[0-9a-fA-F]{24}$/.test(id);

const BOQProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { isRTL, language } = useLanguage();
  const locale = language === "ar" ? "ar-SA" : "en-US";
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<BOQProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/account/boq-projects/${id || ""}`);
      return;
    }

    if (!isValidObjectId(id)) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const res = await boqApi.getBOQProjectById(id!);
        if (cancelled) return;
        if (res?.data) {
          setProject(res.data as BOQProject);
        } else {
          setNotFound(true);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to load BOQ project:", err);
        if (err?.status === 404) {
          setNotFound(true);
        } else {
          toast.error(err?.message || "Failed to load project");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, navigate]);

  const formatNum = (n: number | null | undefined, decimals = 0) => {
    if (n == null || isNaN(n)) return "—";
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: decimals,
    }).format(n);
  };

  const Money = ({ amount }: { amount: number | null | undefined }) => {
    if (amount == null || isNaN(amount)) return <>—</>;
    return (
      <span className="inline-flex items-baseline gap-1">
        {formatNum(amount)} <RiyalSymbol />
      </span>
    );
  };

  const formatDate = (s?: string) => {
    if (!s) return "—";
    return new Date(s).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      <Header />
      <main className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <AccountSidebar />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );

  if (isLoading) {
    return (
      <Shell>
        <div className="bg-white rounded-[6px] border border-[#d8d6df] p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FA6400]" />
          <p className="text-sm text-[#50617a]">
            {isRTL ? "جارٍ تحميل المشروع…" : "Loading project…"}
          </p>
        </div>
      </Shell>
    );
  }

  if (notFound || !project) {
    return (
      <Shell>
        <div className="bg-white rounded-[6px] border border-[#d8d6df] p-12 text-center">
          <AlertCircle className="w-12 h-12 text-[#64748d] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#061b31] mb-1">
            {isRTL ? "لم يتم العثور على المشروع" : "Project not found"}
          </h2>
          <p className="text-sm text-[#50617a] mb-5">
            {isRTL
              ? "ربما تمت إزالة هذا المشروع أو أن الرابط غير صحيح."
              : "This project may have been removed or the link is invalid."}
          </p>
          <Button
            onClick={() => navigate("/account/boq-projects")}
            className="bg-[#FA6400] hover:bg-[#E85A00] text-white font-medium rounded-[4px]"
          >
            {isRTL ? "العودة إلى المشاريع" : "Back to projects"}
          </Button>
        </div>
      </Shell>
    );
  }

  const items = project.boqResult?.items || [];
  const totalCost =
    project.boqResult?.totalEstimatedCost ?? project.estimatedCost ?? 0;
  const notes = project.boqResult?.notes || [];

  return (
    <Shell>
      <div className="space-y-4">
        {/* Back */}
        <Link
          to="/account/boq-projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#50617a] hover:text-[#FA6400] transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {isRTL ? "كل المشاريع" : "All projects"}
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-[6px] border border-[#d8d6df] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 rounded-[4px] bg-[#e5edf5] flex items-center justify-center shrink-0">
                <Calculator className="w-6 h-6 text-[#FA6400]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-medium text-[#061b31] truncate">
                  {project.projectName}
                </h1>
                <p className="text-xs text-[#50617a] mt-0.5">
                  #{project._id.slice(-8).toUpperCase()} ·{" "}
                  {formatDate(project.createdAt)}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide px-2.5 py-1 rounded-full ${
                project.status === "completed"
                  ? "bg-[#e5edf5] text-[#FA6400]"
                  : "bg-[#e5edf5] text-[#50617a]"
              }`}
            >
              {project.status === "completed" && (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              {project.status}
            </span>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-[#e5edf5] rounded-[4px] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748d] mb-1">
                {isRTL ? "النوع" : "Type"}
              </p>
              <p className="text-sm font-semibold text-[#061b31] capitalize">
                {project.projectType || "—"}
              </p>
            </div>
            <div className="bg-[#e5edf5] rounded-[4px] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748d] mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                {isRTL ? "المدينة" : "City"}
              </p>
              <p className="text-sm font-semibold text-[#061b31]">
                {project.city || "—"}
              </p>
            </div>
            <div className="bg-[#e5edf5] rounded-[4px] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748d] mb-1">
                {isRTL ? "المساحة" : "Area"}
              </p>
              <p className="text-sm font-semibold text-[#061b31]">
                {project.areaSqm ? `${formatNum(project.areaSqm)} m²` : "—"}
              </p>
            </div>
            <div className="bg-[#e5edf5] rounded-[4px] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748d] mb-1">
                <Layers className="w-3 h-3 inline mr-1" />
                {isRTL ? "الطوابق" : "Floors"}
              </p>
              <p className="text-sm font-semibold text-[#061b31]">
                {project.floors || "—"}
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="mt-5 flex items-center justify-between bg-[#e5edf5] border border-[#FA6400]/30 rounded-[4px] p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#FA6400] mb-0.5">
                {isRTL ? "التكلفة الإجمالية المقدّرة" : "Total estimated cost"}
              </p>
              {project.boqResult?.timeline && (
                <p className="text-xs text-[#50617a] inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {project.boqResult.timeline}
                </p>
              )}
            </div>
            <div className="text-2xl font-semibold text-[#061b31]">
              <Money amount={totalCost} />
            </div>
          </div>
        </div>

        {/* BOQ items */}
        <div className="bg-white rounded-[6px] border border-[#d8d6df] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#FA6400]" />
            <h2 className="text-lg font-semibold text-[#061b31]">
              {isRTL ? "عناصر BOQ" : "BOQ Items"}
            </h2>
            <span className="text-xs text-[#50617a]">({items.length})</span>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-[#50617a] text-center py-8">
              {isRTL
                ? "لم يتم إنشاء BOQ لهذا المشروع بعد."
                : "No BOQ has been generated for this project yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#d8d6df] bg-[#e5edf5]">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-[#061b31]">
                      {isRTL ? "الفئة" : "Category"}
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-[#061b31]">
                      {isRTL ? "البند" : "Item"}
                    </th>
                    <th className="hidden sm:table-cell text-right py-2.5 px-3 text-xs font-semibold text-[#061b31]">
                      {isRTL ? "الكمية" : "Qty"}
                    </th>
                    <th className="hidden sm:table-cell text-left py-2.5 px-3 text-xs font-semibold text-[#061b31]">
                      {isRTL ? "الوحدة" : "Unit"}
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-[#061b31]">
                      {isRTL ? "سعر الوحدة" : "Unit Price"}
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-[#061b31]">
                      {isRTL ? "الإجمالي" : "Total"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#d8d6df] hover:bg-[#e5edf5]"
                    >
                      <td className="py-2.5 px-3 text-xs text-[#50617a] font-medium">
                        {it.category || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-sm font-medium text-[#061b31]">
                        {it.item || "—"}
                        {it.brand && (
                          <span className="block text-[10px] font-medium text-[#64748d] mt-0.5">
                            {it.brand}
                          </span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell py-2.5 px-3 text-sm text-[#50617a] text-right">
                        {formatNum(it.quantity, 2)}
                      </td>
                      <td className="hidden sm:table-cell py-2.5 px-3 text-xs text-[#50617a]">
                        {it.unit || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-sm text-[#50617a] text-right">
                        <Money amount={it.unitPrice} />
                      </td>
                      <td className="py-2.5 px-3 text-sm font-semibold text-[#061b31] text-right">
                        <Money amount={it.totalPrice} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#d8d6df] bg-[#e5edf5]">
                    <td
                      colSpan={5}
                      className="py-3 px-3 text-sm font-semibold text-[#061b31] text-right"
                    >
                      {isRTL ? "الإجمالي" : "Total"}
                    </td>
                    <td className="py-3 px-3 text-base font-semibold text-[#061b31] text-right">
                      <Money amount={totalCost} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {notes.length > 0 && (
            <div className="mt-5 bg-[#e5edf5] rounded-[4px] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748d] mb-2">
                {isRTL ? "ملاحظات" : "Notes"}
              </p>
              <ul className="space-y-1.5">
                {notes.map((n, i) => (
                  <li key={i} className="text-sm text-[#061b31] flex gap-2">
                    <span className="text-[#FA6400] font-semibold">•</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
};

export default BOQProjectDetailPage;
