import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountSidebar from "@/components/AccountSidebar";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
  CreditCard,
  Gift,
  Loader2,
  AlertCircle,
  Plus,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { locNum, locPrice } from "@/utils/formatPrice";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface Transaction {
  _id: string;
  createdAt: string;
  type: string;
  description: string;
  amount: number;
  balanceAfter: number;
}

const CreditsPage = () => {
  const { t, isRTL, language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    credits,
    isLoading: creditsLoading,
    error: creditsError,
    refetch,
  } = useCredits();

  const isAr = language === "ar";
  const tx = (en: string, ar: string) => (isAr ? ar : en);

  const [activeFilter, setActiveFilter] = useState<
    "all" | "purchase" | "usage" | "subscription"
  >("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Fetch transactions
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const fetchTransactions = async () => {
      setTxLoading(true);
      setTxError(null);
      try {
        const data = await apiClient<{
          transactions: Transaction[];
          total: number;
        }>(`/users/website/${user.id}/credit-transactions?limit=50&offset=0`);
        setTransactions(data.transactions || []);
      } catch (err: any) {
        setTxError(err?.message || "Failed to load transactions");
        console.error("Error fetching transactions:", err);
      } finally {
        setTxLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.id, isAuthenticated]);

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((tx) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "purchase")
        return ["purchase", "free_trial", "subscription"].includes(tx.type);
      if (activeFilter === "usage") return tx.type === "usage";
      if (activeFilter === "subscription") return tx.type === "subscription";
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  const balance = credits?.balance ?? 0;
  // Still on the original free-50 allotment as long as nothing's ever been
  // purchased — label the balance "free BOQs" until a paid pack is bought.
  const stillOnFreeAllotment = (credits?.totalPurchased ?? 0) === 0;
  const hasSubscription =
    credits?.subscriptionPlan &&
    credits?.subscriptionExpiresAt &&
    new Date(credits.subscriptionExpiresAt) > new Date();

  const handleAddCredits = () => {
    navigate("/credits/purchase"); // Or wherever your paywall route is
  };

  const handleWithdraw = () => {
    toast.info(isAr ? "سيتم توفير السحب قريباً" : "Withdrawal coming soon");
  };

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen bg-muted/30 flex items-center justify-center"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isAr ? "يرجى تسجيل الدخول" : "Please log in"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir={isRTL ? "rtl" : "ltr"}>
      <Header />

      <main className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar - Hidden on mobile */}
          <AccountSidebar />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {isRTL ? "رصيد بنّة" : "benna Credits"}
              </h1>
              <Button
                variant="outline"
                className="flex items-center gap-2 self-start sm:self-auto"
                onClick={handleWithdraw}
              >
                {isRTL ? "السحب إلى البنك" : "Withdraw to bank"}
                <ChevronRight
                  className={cn("w-4 h-4", isRTL && "rotate-180")}
                />
              </Button>
            </div>

            {/* Balance Card */}
            <div className="bg-card rounded-lg border p-6 mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                {stillOnFreeAllotment
                  ? isRTL
                    ? "قوائم الكميات المجانية المتبقية"
                    : "Free BOQs remaining"
                  : isRTL
                    ? "الرصيد المتاح"
                    : "Available balance"}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground text-xl">﷼</span>
                <span className="text-4xl font-bold text-foreground">
                  {creditsLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    locNum(balance, { maximumFractionDigits: 0 })
                  )}
                </span>
                <span className="text-xl text-muted-foreground">.00</span>
              </div>
              {hasSubscription && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-violet-100 text-violet-900 rounded-full text-xs font-bold">
                  <Star className="w-3 h-3" />
                  {isAr
                    ? `${credits?.subscriptionPlan} نشط`
                    : `${credits?.subscriptionPlan} active`}
                </div>
              )}
              {creditsError && (
                <p className="text-sm text-red-500 mt-2">{creditsError}</p>
              )}
            </div>

            {/* Add Credits Banner */}
            <button
              onClick={handleAddCredits}
              className="w-full bg-foreground text-background rounded-lg p-4 flex items-center justify-between mb-6 hover:bg-foreground/90 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5" />
                <span className="text-sm sm:text-base font-medium">
                  {isRTL
                    ? "أضف رصيد أو استبدل بطاقات الهدايا"
                    : "Add Credits or Redeem Giftcards"}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center">
                    <CreditCard className="w-3 h-3 text-white" />
                  </div>
                  <div className="w-8 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded flex items-center justify-center">
                    <Gift className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
              <ChevronRight className={cn("w-5 h-5", isRTL && "rotate-180")} />
            </button>

            {/* Transactions Section */}
            <div className="bg-card rounded-lg border">
              {/* Transactions Header */}
              <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {isRTL ? "المعاملات" : "Transactions"}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter Buttons */}
                  <div className="flex gap-1">
                    {(
                      ["all", "purchase", "usage", "subscription"] as const
                    ).map((filter) => (
                      <Button
                        key={filter}
                        variant={
                          activeFilter === filter ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setActiveFilter(filter)}
                        className="text-xs"
                      >
                        {filter === "all"
                          ? isAr
                            ? "الكل"
                            : "All"
                          : filter === "purchase"
                            ? isAr
                              ? "شراء"
                              : "Purchase"
                            : filter === "usage"
                              ? isAr
                                ? "استخدام"
                                : "Usage"
                              : isAr
                                ? "اشتراك"
                                : "Subscription"}
                      </Button>
                    ))}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      {sortBy === "newest"
                        ? isAr
                          ? "الأحدث"
                          : "Newest"
                        : isAr
                          ? "الأقدم"
                          : "Oldest"}
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          showSortDropdown && "rotate-180",
                        )}
                      />
                    </Button>
                    {showSortDropdown && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                        <button
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-lg"
                          onClick={() => {
                            setSortBy("newest");
                            setShowSortDropdown(false);
                          }}
                        >
                          {isAr ? "الأحدث أولاً" : "Newest first"}
                        </button>
                        <button
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 last:rounded-b-lg"
                          onClick={() => {
                            setSortBy("oldest");
                            setShowSortDropdown(false);
                          }}
                        >
                          {isAr ? "الأقدم أولاً" : "Oldest first"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="divide-y">
                {txLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : txError ? (
                  <div className="p-8 text-center text-red-500">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    {txError}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      {isAr ? "إعادة المحاولة" : "Retry"}
                    </Button>
                  </div>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => {
                    const isCredit = transaction.amount > 0;
                    const date = new Date(
                      transaction.createdAt,
                    ).toLocaleDateString(isAr ? "ar-SA" : "en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <div
                        key={transaction._id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                      >
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          {date}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm px-2 py-0.5 bg-muted rounded capitalize">
                            {transaction.type.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex-1 text-sm text-muted-foreground">
                          {transaction.description ||
                            (isAr ? "معاملة" : "Transaction")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isAr ? "الرصيد:" : "Balance:"} ﷼
                          {locNum(transaction.balanceAfter)}
                        </div>
                        <div
                          className={cn(
                            "font-semibold whitespace-nowrap",
                            isCredit ? "text-green-600" : "text-red-500",
                          )}
                        >
                          {isCredit ? "+ " : "- "}﷼{" "}
                          {locPrice(Math.abs(transaction.amount))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    {isRTL ? "لا توجد معاملات" : "No transactions yet"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreditsPage;
