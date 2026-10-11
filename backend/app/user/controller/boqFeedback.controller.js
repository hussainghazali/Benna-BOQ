// app/user/controller/boqFeedback.controller.js
const BoqFeedback = require("../model/boqFeedback.model");
const BoqCatalogGap = require("../model/boqCatalogGap");
const Product = require("../../vendor/model/product.model");
const mongoose = require("mongoose");

// NEW: Product mapping model for learning (was missing)
const ProductMapping = mongoose.model(
  "BOQProductMapping",
  new mongoose.Schema({
    category: { type: String, required: true, index: true },
    originalItem: { type: String, required: true, index: true },
    originalItemNormalized: { type: String, required: true, index: true },
    replacementProductId: { type: String, required: true, index: true },
    replacementProductName: { type: String },
    confidence: { type: Number, default: 1, min: 0 },
    usageCount: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
  }),
);

// Helper: normalize text
const normalizeText = (text) => {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, " ");
};

/**
 * Submit feedback on a BOQ item
 */
exports.submitFeedback = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      projectId,
      projectName,
      projectType,
      city,
      areaSqm,
      floors,
      boqItemId,
      category,
      item,
      originalQuantity,
      originalUnitPrice,
      feedbackType,
      modifiedQuantity,
      modifiedUnitPrice,
      replacementItem,
      replacementProductId,
      replacementReason,
      accuracyScore,
      relevanceScore,
      suggestedImprovement,
      tags,
    } = req.body;

    // Validation
    const errors = [];
    if (!boqItemId) errors.push("boqItemId is required");
    if (!category) errors.push("category is required");
    if (!item) errors.push("item is required");
    if (
      !feedbackType ||
      !["helpful", "inaccurate", "missing", "replaced", "removed"].includes(
        feedbackType,
      )
    ) {
      errors.push(
        "feedbackType must be one of: helpful, inaccurate, missing, replaced, removed",
      );
    }
    if (
      accuracyScore !== undefined &&
      (accuracyScore < 1 || accuracyScore > 5)
    ) {
      errors.push("accuracyScore must be between 1 and 5");
    }
    if (
      relevanceScore !== undefined &&
      (relevanceScore < 1 || relevanceScore > 5)
    ) {
      errors.push("relevanceScore must be between 1 and 5");
    }
    if (suggestedImprovement && suggestedImprovement.length > 5000) {
      errors.push("suggestedImprovement too long (max 5000 chars)");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Check for duplicate feedback (same user, same item, within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingFeedback = await BoqFeedback.findOne({
      customerId: String(userId),
      boqItemId,
      createdAt: { $gte: oneHourAgo },
    });

    if (existingFeedback) {
      return res.status(429).json({
        success: false,
        message:
          "Feedback already submitted for this item recently. Please wait 1 hour.",
      });
    }

    const feedback = await BoqFeedback.create({
      customerId: String(userId),
      projectId,
      projectName: projectName?.trim().slice(0, 200),
      projectType,
      city,
      areaSqm: areaSqm ? Number(areaSqm) : undefined,
      floors: floors ? Number(floors) : undefined,
      boqItemId,
      category: category.trim(),
      item: item.trim().slice(0, 500),
      originalQuantity: originalQuantity ? Number(originalQuantity) : 0,
      originalUnitPrice: originalUnitPrice ? Number(originalUnitPrice) : 0,
      feedbackType,
      modifiedQuantity: modifiedQuantity ? Number(modifiedQuantity) : undefined,
      modifiedUnitPrice: modifiedUnitPrice
        ? Number(modifiedUnitPrice)
        : undefined,
      replacementItem: replacementItem?.trim().slice(0, 500),
      replacementProductId,
      replacementReason: replacementReason?.trim().slice(0, 2000),
      accuracyScore: accuracyScore ? Number(accuracyScore) : 0,
      relevanceScore: relevanceScore ? Number(relevanceScore) : 0,
      suggestedImprovement: suggestedImprovement?.trim().slice(0, 5000),
      tags:
        tags
          ?.filter((t) => typeof t === "string")
          .map((t) => t.trim().slice(0, 100)) || [],
      userAgent: req.headers["user-agent"]?.slice(0, 1000),
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    // If feedback is "missing", log it as a catalog gap
    if (feedbackType === "missing") {
      await BoqCatalogGap.findOneAndUpdate(
        {
          customerId: String(userId),
          boqItemNormalized: normalizeText(item),
          boqCategory: category.trim(),
        },
        {
          $setOnInsert: {
            customerId: String(userId),
            boqItemNormalized: normalizeText(item),
            boqCategory: category.trim(),
            status: "pending",
          },
          $inc: { requestCount: 1 },
          $set: {
            lastRequestedAt: new Date(),
            boqItem: item.trim().slice(0, 500),
            quantity: originalQuantity ? Number(originalQuantity) : 0,
            estimatedUnitPrice: originalUnitPrice
              ? Number(originalUnitPrice)
              : 0,
            estimatedTotalPrice:
              originalQuantity && originalUnitPrice
                ? Number(originalQuantity) * Number(originalUnitPrice)
                : 0,
            projectName: projectName?.trim().slice(0, 200),
            projectType,
            city,
            areaSqm: areaSqm ? Number(areaSqm) : 0,
            floors: floors ? Number(floors) : 1,
          },
        },
        { upsert: true, new: true },
      );
    }

    // If feedback is "replaced" with a product ID, learn the mapping (NOW PERSISTED)
    if (feedbackType === "replaced" && replacementProductId) {
      try {
        await learnProductMapping(category, item, replacementProductId);
      } catch (err) {
        console.error("[BOQ Learning] Failed to learn mapping:", err);
        // Don't fail the request if learning fails
      }
    }

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get feedback analytics for learning
 */
exports.getFeedbackAnalytics = async (req, res, next) => {
  try {
    // Admin only - add role check in production
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      projectType,
      category,
      city,
      feedbackType,
      limit = 100,
    } = req.query;

    const filter = {};
    if (projectType) filter.projectType = projectType;
    if (category) filter.category = category;
    if (city) filter.city = city;
    if (feedbackType) filter.feedbackType = feedbackType;

    const safeLimit = Math.min(500, Math.max(1, parseInt(limit) || 100));

    const [feedback, stats] = await Promise.all([
      BoqFeedback.find(filter).sort({ createdAt: -1 }).limit(safeLimit).lean(),
      BoqFeedback.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$category",
            totalFeedback: { $sum: 1 },
            avgAccuracy: { $avg: "$accuracyScore" },
            avgRelevance: { $avg: "$relevanceScore" },
            feedbackTypes: { $push: "$feedbackType" },
          },
        },
        {
          $project: {
            category: "$_id",
            totalFeedback: 1,
            avgAccuracy: { $round: ["$avgAccuracy", 2] },
            avgRelevance: { $round: ["$avgRelevance", 2] },
            helpfulCount: {
              $size: {
                $filter: {
                  input: "$feedbackTypes",
                  cond: { $eq: ["$$this", "helpful"] },
                },
              },
            },
            inaccurateCount: {
              $size: {
                $filter: {
                  input: "$feedbackTypes",
                  cond: { $eq: ["$$this", "inaccurate"] },
                },
              },
            },
          },
        },
        { $sort: { totalFeedback: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: feedback,
      stats,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Learn product mappings from user replacements — NOW PERSISTED
 */
async function learnProductMapping(
  category,
  originalItem,
  replacementProductId,
) {
  try {
    const product = await Product.findById(replacementProductId).lean();
    if (!product) {
      console.log(`[BOQ Learning] Product not found: ${replacementProductId}`);
      return;
    }

    const normalizedItem = normalizeText(originalItem);

    // Upsert the mapping with confidence scoring
    await ProductMapping.findOneAndUpdate(
      {
        category: category.trim(),
        originalItemNormalized: normalizedItem,
        replacementProductId: String(replacementProductId),
      },
      {
        $setOnInsert: {
          category: category.trim(),
          originalItem: originalItem.trim().slice(0, 500),
          originalItemNormalized: normalizedItem,
          replacementProductId: String(replacementProductId),
          replacementProductName: product.name?.trim().slice(0, 200),
          createdAt: new Date(),
        },
        $inc: { usageCount: 1, confidence: 0.1 },
        $set: { lastUsedAt: new Date() },
      },
      { upsert: true, new: true },
    );

    console.log(
      `[BOQ Learning] Mapping persisted: "${originalItem}" -> "${product.name}" (${replacementProductId}) in category "${category}"`,
    );
  } catch (error) {
    console.error("[BOQ Learning] Error learning mapping:", error);
    throw error; // Let caller handle
  }
}

/**
 * Get learning insights for BOQ generation improvement
 */
exports.getLearningInsights = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const insights = await BoqFeedback.aggregate([
      {
        $group: {
          _id: {
            projectType: "$projectType",
            category: "$category",
            city: "$city",
          },
          totalFeedback: { $sum: 1 },
          avgAccuracy: { $avg: "$accuracyScore" },
          avgRelevance: { $avg: "$relevanceScore" },
          commonIssues: {
            $push: {
              type: "$feedbackType",
              item: "$item",
              reason: "$replacementReason",
            },
          },
        },
      },
      {
        $project: {
          projectType: "$_id.projectType",
          category: "$_id.category",
          city: "$_id.city",
          totalFeedback: 1,
          avgAccuracy: { $round: ["$avgAccuracy", 2] },
          avgRelevance: { $round: ["$avgRelevance", 2] },
          inaccurateRate: {
            $round: [
              {
                $divide: [
                  {
                    $size: {
                      $filter: {
                        input: "$commonIssues",
                        cond: { $eq: ["$$this.type", "inaccurate"] },
                      },
                    },
                  },
                  "$totalFeedback",
                ],
              },
              2,
            ],
          },
          missingRate: {
            $round: [
              {
                $divide: [
                  {
                    $size: {
                      $filter: {
                        input: "$commonIssues",
                        cond: { $eq: ["$$this.type", "missing"] },
                      },
                    },
                  },
                  "$totalFeedback",
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { totalFeedback: -1 } },
      { $limit: 50 },
    ]);

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get suggested improvements based on feedback
 */
exports.getSuggestedImprovements = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { projectType, city } = req.query;

    const suggestions = await BoqFeedback.aggregate([
      {
        $match: {
          feedbackType: { $in: ["inaccurate", "missing"] },
          ...(projectType && { projectType }),
          ...(city && { city }),
        },
      },
      {
        $group: {
          _id: "$category",
          commonIssues: {
            $push: {
              item: "$item",
              type: "$feedbackType",
              suggestion: "$suggestedImprovement",
              accuracyScore: "$accuracyScore",
            },
          },
          avgAccuracy: { $avg: "$accuracyScore" },
          totalIssues: { $sum: 1 },
        },
      },
      {
        $project: {
          category: "$_id",
          commonIssues: 1,
          avgAccuracy: { $round: ["$avgAccuracy", 2] },
          totalIssues: 1,
          priority: {
            $cond: {
              if: { $lt: ["$avgAccuracy", 3] },
              then: "high",
              else: "medium",
            },
          },
        },
      },
      { $sort: { totalIssues: -1 } },
      { $limit: 20 },
    ]);

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (err) {
    next(err);
  }
};

// NEW: Get learned product mappings
exports.getProductMappings = async (req, res, next) => {
  try {
    const { category, item, limit = 50 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (item) filter.originalItemNormalized = normalizeText(item);

    const mappings = await ProductMapping.find(filter)
      .sort({ confidence: -1, usageCount: -1 })
      .limit(Math.min(100, parseInt(limit) || 50))
      .lean();

    res.status(200).json({
      success: true,
      data: mappings,
    });
  } catch (err) {
    next(err);
  }
};
