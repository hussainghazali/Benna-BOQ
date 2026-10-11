// app/user/controller/boqProductMatcher.controller.js
const Product = require("../../vendor/model/product.model");
const ProductSearchIndex = require("../model/productSearchIndex.model");

// Helper: normalize text with proper Unicode support
const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Keep all letters including Arabic
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Smart product matching for BOQ items using 19k+ products
 */
class BOQProductMatcher {
  /**
   * Find matching products for a BOQ item
   */
  static async findMatches(boqItem, options = {}) {
    const {
      category,
      brand,
      city,
      limit = 10,
      includeOutOfStock = false,
    } = options;

    if (!boqItem || typeof boqItem !== "string") {
      throw new Error("boqItem must be a non-empty string");
    }

    const normalizedItem = normalizeText(boqItem);
    const tokens = this.tokenize(normalizedItem);

    if (tokens.length === 0) {
      return [];
    }

    // First try exact matches in search index
    const searchMatches = await this.searchIndexMatches(
      tokens,
      category,
      limit,
    );

    // Fallback to product collection if no matches
    if (searchMatches.length === 0) {
      return this.productCollectionMatches(
        normalizedItem,
        category,
        brand,
        limit,
        includeOutOfStock,
      );
    }

    // Enhance with location-based pricing if city provided
    if (city) {
      return this.adjustForLocation(searchMatches, city);
    }

    return searchMatches;
  }

  /**
   * Search index-based matching (fast)
   */
  static async searchIndexMatches(tokens, category, limit) {
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const filter = {
      tokens: { $in: tokens },
      inStock: true,
    };

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    const matches = await ProductSearchIndex.find(filter)
      .sort({ score: -1, popularityScore: -1 })
      .limit(safeLimit)
      .lean();

    return matches.map((m) => ({
      productId: m.productId,
      name: m.name,
      nameArabic: m.nameArabic,
      category: m.category,
      brand: m.brand,
      price: m.price,
      inStock: m.inStock,
      vendorId: m.vendorId,
      matchScore: this.calculateMatchScore(tokens, m.tokens || []),
      popularity: m.popularityScore,
    }));
  }

  /**
   * Product collection matching (fallback)
   */
  static async productCollectionMatches(
    normalizedItem,
    category,
    brand,
    limit,
    includeOutOfStock,
  ) {
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const filter = {
      fieldType: "Product",
      status: { $in: ["approved", "active", "published"] },
    };

    if (!includeOutOfStock) {
      filter.inventory = "InStock";
    }

    const orConditions = [];

    if (category) {
      orConditions.push(
        { collections: { $regex: category, $options: "i" } },
        { category: { $regex: category, $options: "i" } },
      );
    }

    if (brand) {
      filter.brand = { $regex: brand, $options: "i" };
    }

    // Text search
    if (normalizedItem) {
      orConditions.push(
        { name: { $regex: normalizedItem, $options: "i" } },
        { nameArabic: { $regex: normalizedItem, $options: "i" } },
        { description: { $regex: normalizedItem, $options: "i" } },
        { sku: { $regex: normalizedItem, $options: "i" } },
      );
    }

    if (orConditions.length > 0) {
      filter.$or = orConditions;
    }

    const matches = await Product.find(filter)
      .select(
        "_id name nameArabic brand collections category price inventory uploadedByVendorId productImageUrl discountMode discountValue",
      )
      .limit(safeLimit)
      .lean();

    return matches.map((m) => ({
      productId: m._id,
      name: m.name,
      nameArabic: m.nameArabic,
      category: m.collections || m.category,
      brand: m.brand,
      price: m.price,
      inStock: m.inventory === "InStock",
      vendorId: m.uploadedByVendorId,
      matchScore: 0.5, // Lower score for fallback matches
      popularity: 0,
      productImageUrl: m.productImageUrl,
      discountMode: m.discountMode,
      discountValue: m.discountValue,
    }));
  }

  /**
   * Calculate match score based on token overlap
   */
  static calculateMatchScore(queryTokens, productTokens) {
    if (!queryTokens?.length || !productTokens?.length) return 0;
    const intersection = queryTokens.filter((t) => productTokens.includes(t));
    const union = new Set([...queryTokens, ...productTokens]);
    return intersection.length / union.size;
  }

  /**
   * Adjust pricing for location
   */
  static async adjustForLocation(matches, city) {
    const cityMultipliers = {
      riyadh: 1.0,
      jeddah: 1.05,
      dammam: 1.03,
      mecca: 1.08,
      madinah: 1.06,
    };

    const multiplier = cityMultipliers[city.toLowerCase()] || 1.0;

    return matches.map((m) => ({
      ...m,
      adjustedPrice: Math.round(m.price * multiplier * 100) / 100,
      locationAdjustment: multiplier,
    }));
  }

  /**
   * Tokenize text
   */
  static tokenize(text) {
    if (!text) return [];
    return text.split(/\s+/).filter((t) => t.length >= 2); // Ignore single chars
  }

  /**
   * Get category-based recommendations
   */
  static async getCategoryRecommendations(category, limit = 20) {
    if (!category || typeof category !== "string") {
      throw new Error("category must be a non-empty string");
    }

    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const products = await ProductSearchIndex.find({
      category: { $regex: category, $options: "i" },
      inStock: true,
    })
      .sort({ popularityScore: -1, orderScore: -1 })
      .limit(safeLimit)
      .lean();

    return products.map((p) => ({
      productId: p.productId,
      name: p.name,
      nameArabic: p.nameArabic,
      brand: p.brand,
      price: p.price,
      popularity: p.popularityScore,
    }));
  }

  /**
   * Get trending products for BOQ
   */
  static async getTrendingProducts(limit = 50) {
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit) || 50));

    const products = await ProductSearchIndex.find({
      inStock: true,
    })
      .sort({ popularityScore: -1, orderScore: -1 })
      .limit(safeLimit)
      .lean();

    return products.map((p) => ({
      productId: p.productId,
      name: p.name,
      nameArabic: p.nameArabic,
      category: p.category,
      brand: p.brand,
      price: p.price,
      popularity: p.popularityScore,
      orderScore: p.orderScore,
    }));
  }
}

/**
 * Controller endpoints for BOQ product matching
 */
exports.findMatches = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { item, category, brand, city, limit = 10 } = req.body;

    if (!item || typeof item !== "string" || item.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Item is required and must be a non-empty string",
      });
    }

    if (item.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Item name too long (max 500 characters)",
      });
    }

    const matches = await BOQProductMatcher.findMatches(item.trim(), {
      category,
      brand,
      city,
      limit,
    });

    res.status(200).json({
      success: true,
      data: matches,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCategoryRecommendations = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { category, limit = 20 } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "category query parameter is required",
      });
    }

    const recommendations = await BOQProductMatcher.getCategoryRecommendations(
      category,
      parseInt(limit),
    );

    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTrendingProducts = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { limit = 50 } = req.query;

    const trending = await BOQProductMatcher.getTrendingProducts(
      parseInt(limit),
    );

    res.status(200).json({
      success: true,
      data: trending,
    });
  } catch (err) {
    next(err);
  }
};

module.exports.BOQProductMatcher = BOQProductMatcher;
