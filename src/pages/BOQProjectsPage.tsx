// src/pages/BOQProjectsPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountSidebar from "@/components/AccountSidebar";
import { Button } from "@/components/ui/button";
import { boqApi } from "@/lib/api-boq";
import { toast } from "sonner";
import {
  FolderKanban,
  Plus,
  Loader2,
  CheckCircle,
  Calculator,
  MapPin,
  Layers,
  FileText,
  Sparkles,
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-table";
import RiyalSymbol from "@/components/ui/RiyalSymbol";

interface BOQProject {
  _id: string;
  customerId: string;
  projectName: string;
  projectType: string;
  city: string;
  areaSqm: number;
  floors: number;
  specifications: Record<string, any>;
  boqResult: Record<string, any>;
  estimatedCost: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const BOQProjectsPage = () => {
  const { isRTL, language } = useLanguage();
  const isAr = language === "ar";
  const tx = (en: string, ar: string) => (isAr ? ar : en);
  const locale = isAr ? "ar-SA" : "en-US";
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<BOQProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProjects = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await boqApi.getBOQProjects(page, 10);
      if (response?.data?.projects) {
        setProjects(response.data.projects);
        setTotalPages(response.data.pagination.totalPages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("Failed to load BOQ projects:", error);
      toast.error(tx("Failed to load BOQ projects", "فشل تحميل مشاريع BOQ"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login?redirect=/account/boq-projects");
      return;
    }
    loadProjects(1);
  }, [isAuthenticated, navigate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide bg-[#e5edf5] text-[#50617a] px-2.5 py-1 rounded-full">
            {tx("Draft", "مسودة")}
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide bg-[#e5edf5] text-[#FF6600] px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            {tx("Completed", "مكتمل")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide bg-[#e5edf5] text-[#50617a] px-2.5 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  const NA = tx("N/A", "غير متوفر");

  const formatAmount = (amount: number): React.ReactNode => {
    if (!amount || amount <= 0) return NA;
    const num = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(amount);
    return (
      <span className="inline-flex items-baseline gap-1 font-bold text-black">
        {num} <RiyalSymbol />
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return NA;
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleNewProject = () => {
    navigate("/build-project");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
        <Header />
        <main className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <AccountSidebar />
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-[6px] shadow-sm border border-[#d8d6df] p-8">
                <TableSkeleton rows={5} columns={5} />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      <Header />
      <main className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <AccountSidebar />
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-[6px] shadow-sm border border-[#d8d6df] p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-1 bg-[#FF6600] rounded-full" />
                      <h2 className="text-[22px] font-medium text-[#061b31]">
                        {tx("BOQ / Projects", "جداول الكميات / المشاريع")}
                      </h2>
                    </div>
                    <p className="text-sm text-[#50617a]">
                      {tx(
                        "View and manage Bill of Quantities and projects",
                        "عرض وإدارة جداول الكميات والمشاريع",
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleNewProject}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#FF6600] hover:bg-[#E65C00] rounded-[4px] transition-all duration-200 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {tx("New Project", "مشروع جديد")}
                </Button>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-[#e5edf5] flex items-center justify-center mx-auto mb-4">
                    <Calculator className="w-10 h-10 text-[#50617a]" />
                  </div>
                  <p className="text-lg font-semibold text-[#061b31] mb-2">
                    {tx("No BOQ projects found", "لا توجد مشاريع BOQ")}
                  </p>
                  <p className="text-sm text-[#50617a] mb-4">
                    {tx(
                      "You haven't created any BOQ projects yet.",
                      "لم تقم بإنشاء أي مشاريع BOQ بعد.",
                    )}
                  </p>
                  <Button
                    onClick={handleNewProject}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#FF6600] hover:bg-[#E65C00] rounded-[4px] transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <Sparkles className="w-4 h-4" />
                    {tx("Create Your First Project", "أنشئ أول مشروع لك")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#d8d6df] bg-[#e5edf5]">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#061b31]">
                            {tx("Project Name", "اسم المشروع")}
                          </th>
                          <th className="hidden md:table-cell text-left py-3 px-4 text-sm font-semibold text-[#061b31]">
                            {tx("Type", "النوع")}
                          </th>
                          <th className="hidden lg:table-cell text-left py-3 px-4 text-sm font-semibold text-[#061b31]">
                            {tx("City", "المدينة")}
                          </th>
                          <th className="hidden lg:table-cell text-left py-3 px-4 text-sm font-semibold text-[#061b31]">
                            {tx("Area (sqm)", "المساحة (م²)")}
                          </th>
                          <th className="hidden lg:table-cell text-left py-3 px-4 text-sm font-semibold text-[#061b31]">
                            {tx("Floors", "الطوابق")}
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#061b31]">
                            {tx("Est. Cost", "التكلفة التقديرية")}
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#061b31]">
                            {tx("Status", "الحالة")}
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#061b31]">
                            {tx("Date", "التاريخ")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project) => (
                          <tr
                            key={project._id}
                            className="border-b border-[#d8d6df] hover:bg-[#e5edf5] transition-colors cursor-pointer group"
                            onClick={() =>
                              navigate(`/account/boq-projects/${project._id}`)
                            }
                          >
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-medium text-[#061b31]">
                                  {project.projectName}
                                </p>
                                {project.boqResult &&
                                  Object.keys(project.boqResult).length > 0 && (
                                    <p className="text-xs text-[#FF6600] font-medium mt-1 flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      {tx("BOQ Generated", "تم إنشاء BOQ")}
                                    </p>
                                  )}
                              </div>
                            </td>
                            <td className="hidden md:table-cell py-3 px-4 text-sm font-medium text-[#50617a]">
                              {project.projectType || NA}
                            </td>
                            <td className="hidden lg:table-cell py-3 px-4 text-sm text-[#50617a]">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#FF6600]" />
                                {project.city || NA}
                              </div>
                            </td>
                            <td className="hidden lg:table-cell py-3 px-4 text-sm font-medium text-[#50617a]">
                              {project.areaSqm
                                ? `${project.areaSqm.toLocaleString()} ${tx("m²", "م²")}`
                                : NA}
                            </td>
                            <td className="hidden lg:table-cell py-3 px-4 text-sm text-[#50617a]">
                              <div className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-[#FF6600]" />
                                {project.floors || NA}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {formatAmount(project.estimatedCost)}
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(project.status)}
                            </td>
                            <td className="py-3 px-4 text-sm text-[#50617a]">
                              {formatDate(project.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#d8d6df]">
                      <button
                        onClick={() => loadProjects(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-[#061b31] bg-[#e5edf5] rounded-[4px] hover:bg-[#d8d6df] hover:text-[#FF6600] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {tx("Previous", "السابق")}
                      </button>
                      <span className="text-sm text-[#50617a]">
                        {tx(
                          `Page ${currentPage} of ${totalPages}`,
                          `صفحة ${currentPage} من ${totalPages}`,
                        )}
                      </span>
                      <button
                        onClick={() => loadProjects(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-[#061b31] bg-[#e5edf5] rounded-[4px] hover:bg-[#d8d6df] hover:text-[#FF6600] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {tx("Next", "التالي")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BOQProjectsPage;
