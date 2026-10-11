import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { getCurrentUserId, subscribeToAuthSession } from "@/lib/auth-session";

export interface CreditInfo {
  balance: number;
  freeTrialUsed: boolean;
  totalPurchased: number;
  totalUsed: number;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  isUnlimited: boolean;
}

interface UseCreditsReturn {
  credits: CreditInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCredits = (): UseCreditsReturn => {
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchCredits = useCallback(async () => {
    const customerId = getCurrentUserId();
    if (!customerId) {
      setCredits(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Prevent duplicate concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<{
        customerId: string;
        balance: number;
        freeTrialUsed: boolean;
        totalPurchased: number;
        totalUsed: number;
        subscriptionPlan: string | null;
        subscriptionExpiresAt: string | null;
        isUnlimited: boolean;
      }>(`/users/website/${customerId}/credits`);

      setCredits({
        balance: data.balance ?? 0,
        freeTrialUsed: data.freeTrialUsed ?? false,
        totalPurchased: data.totalPurchased ?? 0,
        totalUsed: data.totalUsed ?? 0,
        subscriptionPlan: data.subscriptionPlan ?? null,
        subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
        isUnlimited: data.isUnlimited ?? false,
      });
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to fetch credits";
      setError(errorMessage);
      console.error("Error fetching credits:", err);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToAuthSession(() => {
        // Small delay to prevent rapid-fire fetches during auth state transitions
        setTimeout(() => {
          if (getCurrentUserId()) {
            void fetchCredits();
          } else {
            setCredits(null);
            setIsLoading(false);
          }
        }, 100);
      });
    } catch (err) {
      console.error("Error subscribing to auth session:", err);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchCredits]);

  return { credits, isLoading, error, refetch: fetchCredits };
};
