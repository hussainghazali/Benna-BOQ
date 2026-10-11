// src/lib/api-boq.ts - BOQ-related API functions
import { apiClient } from "./api-client";

// Define types locally to avoid dependency issues
export interface BOQFeedbackInput {
  customerId: string;
  projectId?: string;
  projectName?: string;
  projectType?: string;
  city?: string;
  areaSqm?: number;
  floors?: number;
  boqItemId: string;
  category: string;
  item: string;
  originalQuantity: number;
  originalUnitPrice: number;
  feedbackType: "helpful" | "inaccurate" | "missing" | "replaced" | "removed";
  accuracyScore?: number;
  relevanceScore?: number;
  suggestedImprovement?: string;
  replacementItem?: string;
  replacementReason?: string;
}

export interface BOQProductMatchInput {
  item: string;
  category?: string;
  brand?: string;
  city?: string;
  limit?: number;
}

export interface BOQProductMatch {
  productId: string;
  name: string;
  nameArabic?: string;
  category: string;
  brand?: string;
  price: number;
  inStock: boolean;
  vendorId?: string;
  matchScore: number;
  popularity?: number;
}

// ===================== BOQ API =====================
export const boqApi = {
  submitFeedback: (feedback: BOQFeedbackInput) =>
    apiClient<{ success: boolean; data: any }>("/users/website/boq-feedback", {
      method: "POST",
      body: JSON.stringify(feedback),
    }),

  getFeedbackAnalytics: (params?: {
    projectType?: string;
    category?: string;
    city?: string;
    feedbackType?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.projectType)
      searchParams.append("projectType", params.projectType);
    if (params?.category) searchParams.append("category", params.category);
    if (params?.city) searchParams.append("city", params.city);
    if (params?.feedbackType)
      searchParams.append("feedbackType", params.feedbackType);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    return apiClient<{ success: boolean; data: any[]; stats: any[] }>(
      `/users/website/boq-feedback/analytics?${searchParams.toString()}`,
    );
  },

  getLearningInsights: () =>
    apiClient<{ success: boolean; data: any[] }>(
      "/users/website/boq-feedback/insights",
    ),

  getSuggestedImprovements: (params?: {
    projectType?: string;
    city?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.projectType)
      searchParams.append("projectType", params.projectType);
    if (params?.city) searchParams.append("city", params.city);
    return apiClient<{ success: boolean; data: any[] }>(
      `/users/website/boq-feedback/suggestions?${searchParams.toString()}`,
    );
  },

  findProductMatches: (input: BOQProductMatchInput) =>
    apiClient<{ success: boolean; data: BOQProductMatch[] }>(
      "/users/website/boq-product-matcher/find-matches",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  getCategoryRecommendations: (category: string, limit = 20) =>
    apiClient<{ success: boolean; data: any[] }>(
      `/users/website/boq-product-matcher/category-recommendations?category=${encodeURIComponent(category)}&limit=${limit}`,
    ),

  getTrendingProducts: (limit = 50) =>
    apiClient<{ success: boolean; data: any[] }>(
      `/users/website/boq-product-matcher/trending?limit=${limit}`,
    ),

  // Create + persist a BOQ project. Backend (credits.controller.js
  // createBOQProject, mounted on POST /boq-projects) deducts 1 credit AND
  // saves the project doc atomically, so this is the ONLY call generate()
  // should make for a paid/free BOQ generation — do not also call
  // /credits/deduct separately, that would double-charge the customer.
  // NOTE: backend returns the raw Mongo doc here (`res.json(project[0])`),
  // not the {success,data} envelope used by most other endpoints.
  createBOQProject: (data: {
    projectName: string;
    projectType: string;
    city: string;
    areaSqm: number;
    floors: number;
    specifications?: Record<string, any>;
    boqResult?: Record<string, any>;
    estimatedCost?: number;
  }) =>
    apiClient<{
      _id: string;
      customerId: string;
      projectName: string;
      projectType: string;
      city: string;
      areaSqm: number;
      floors: number;
      specifications?: Record<string, any>;
      boqResult?: Record<string, any>;
      estimatedCost?: number;
      status: string;
      createdAt: string;
    }>("/users/website/boq-projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // NEW: Get BOQ projects
  getBOQProjects: (page = 1, limit = 10) =>
    apiClient<{ success: boolean; data: { projects: any[]; pagination: any } }>(
      `/users/website/boq-projects?page=${page}&limit=${limit}`,
    ),

  // NEW: Get single BOQ project
  getBOQProjectById: (projectId: string) =>
    apiClient<{ success: boolean; data: any }>(
      `/users/website/boq-projects/${projectId}`,
    ),

  // NEW: Delete BOQ project
  deleteBOQProject: (projectId: string) =>
    apiClient<{ success: boolean }>(
      `/users/website/boq-projects/${projectId}`,
      { method: "DELETE" },
    ),

  // NEW: Log catalog gaps
  logGaps: (gapsData: any) =>
    apiClient<{ success: boolean }>("/users/website/boq-gaps/log", {
      method: "POST",
      body: JSON.stringify(gapsData),
    }),
};
