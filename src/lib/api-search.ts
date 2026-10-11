// Product search used by the BOQ matcher. The real storefront prefers Algolia
// and falls back to GET /users/website/search; this standalone build only has
// the backend search endpoint.
import { apiClient } from "./api-client";

interface SearchResponse {
  data: any[];
}

export const searchApi = {
  search: async (
    query: string,
    opts: { limit?: number; page?: number } = {},
  ): Promise<SearchResponse> => {
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
