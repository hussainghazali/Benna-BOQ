// app/user/controller/boqGaps.controller.js
const BoqCatalogGap = require("../model/boqCatalogGap");
// const logger = require("../../../helpers/logger");

// Helper: normalize an item name for dedup
// FIXED: Proper Unicode support for Arabic and all languages
const normalize = (s = "") => {
  const str = String(s);
  // Remove HTML tags
  const noHtml = str.replace(/<[^>]*>/g, " ");
  // Keep letters (including Arabic), numbers, and spaces; remove everything else
  // \p{L} = any letter, \p{N} = any number, \p{Arabic} = Arabic script
  const clean = noHtml.replace(/[^\p{L}\p{N}\s]/gu, " ");
  // Collapse whitespace
  return clean.replace(/\s+/g, " ").trim().toLowerCase();
};

/**
 * POST /api/users/website/boq-gaps/log
 * Body: {
 *   customerId, projectId, projectName, projectType, city, areaSqm, floors,
 *   gaps: [{ category, item, brand, quantity, unit, unitPrice, totalPrice, score }]
 * }
 */
const logBoqGaps = async (req, res) => {
  try {
    console.log("Log BOQ gaps attempt", {
      endpoint: "/users/website/boq-gaps/log",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      projectId: req.body.projectId,
      gapsCount: req.body.gaps?.length || 0,
    });

    const userId = req.user?.id || req.userId;
    if (!userId) {
      console.warn("Log BOQ gaps failed: Authentication required", {
        endpoint: "/users/website/boq-gaps/log",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      projectId = null,
      projectName = "",
      projectType = "",
      city = "",
      areaSqm = 0,
      floors = 1,
      gaps = [],
    } = req.body || {};

    if (!Array.isArray(gaps) || gaps.length === 0) {
      console.log("Log BOQ gaps successful (no gaps)", {
        endpoint: "/users/website/boq-gaps/log",
        ip: req._remoteAddress,
        userId,
      });
      return res.status(200).json({ success: true, inserted: 0 });
    }

    // Cap gaps array to prevent abuse
    if (gaps.length > 500) {
      console.warn("Log BOQ gaps failed: Too many gaps", {
        endpoint: "/users/website/boq-gaps/log",
        ip: req._remoteAddress,
        userId,
        gapsCount: gaps.length,
      });
      return res.status(400).json({
        success: false,
        message: "Too many gaps. Maximum 500 per request.",
      });
    }

    const ops = gaps.map((g) => {
      const itemNorm = normalize(g.item);
      const categoryNorm = String(g.category || "").trim();
      const score = Number(g.score || 0);
      const matchType = score === 0 ? "unmatched" : "weak_match";

      return {
        updateOne: {
          filter: {
            customerId: String(userId),
            boqItemNormalized: itemNorm,
            boqCategory: categoryNorm,
          },
          update: {
            $setOnInsert: {
              customerId: String(userId),
              boqItemNormalized: itemNorm,
              boqCategory: categoryNorm,
              status: "pending",
            },
            $inc: { requestCount: 1 },
            $set: {
              projectId,
              projectName: String(projectName).trim().slice(0, 200),
              projectType: String(projectType).trim(),
              city: String(city).trim(),
              areaSqm: Number(areaSqm) || 0,
              floors: Number(floors) || 1,
              boqItem: String(g.item || "")
                .trim()
                .slice(0, 500),
              boqBrand: String(g.brand || "")
                .trim()
                .slice(0, 100),
              quantity: Math.max(0, Number(g.quantity || 0)),
              unit: String(g.unit || "")
                .trim()
                .slice(0, 50),
              estimatedUnitPrice: Math.max(0, Number(g.unitPrice || 0)),
              estimatedTotalPrice: Math.max(0, Number(g.totalPrice || 0)),
              bestMatchScore: Math.max(0, Math.min(1, Number(score))),
              matchType,
              lastRequestedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    const result = await BoqCatalogGap.bulkWrite(ops, { ordered: false });

    console.log("Log BOQ gaps successful", {
      endpoint: "/users/website/boq-gaps/log",
      ip: req._remoteAddress,
      userId,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
    });

    return res.json({
      success: true,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
    });
  } catch (err) {
    console.error("Log BOQ gaps error", {
      endpoint: "/users/website/boq-gaps/log",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[boq-gaps/log] error", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to log BOQ gaps" });
  }
};

/**
 * GET /api/users/website/boq-gaps
 * Admin/vendor list with filters + pagination.
 */
const getBoqGaps = async (req, res) => {
  try {
    console.log("Get BOQ gaps attempt", {
      endpoint: "/users/website/boq-gaps",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      status: req.query.status,
      category: req.query.category,
      page: req.query.page,
      limit: req.query.limit,
    });

    const userId = req.user?.id || req.userId;
    if (!userId) {
      console.warn("Get BOQ gaps failed: Authentication required", {
        endpoint: "/users/website/boq-gaps",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      status,
      category,
      city,
      projectType,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (
      status &&
      ["pending", "in_review", "sourcing", "added", "ignored"].includes(status)
    ) {
      filter.status = status;
    }
    if (category) filter.boqCategory = category;
    if (city) filter.city = city;
    if (projectType) filter.projectType = projectType;
    if (search) {
      filter.boqItemNormalized = { $regex: normalize(search), $options: "i" };
    }

    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      BoqCatalogGap.find(filter)
        .sort({ requestCount: -1, lastRequestedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      BoqCatalogGap.countDocuments(filter),
    ]);

    console.log("Get BOQ gaps successful", {
      endpoint: "/users/website/boq-gaps",
      ip: req._remoteAddress,
      userId,
      count: items.length,
      total,
    });

    res.json({
      success: true,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      items,
    });
  } catch (err) {
    console.error("Get BOQ gaps error", {
      endpoint: "/users/website/boq-gaps",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[boq-gaps GET] error", err);
    res.status(500).json({ success: false, error: "Failed to fetch BOQ gaps" });
  }
};

/**
 * GET /api/users/website/boq-gaps/summary
 */
const getBoqGapsSummary = async (req, res) => {
  try {
    console.log("Get BOQ gaps summary attempt", {
      endpoint: "/users/website/boq-gaps/summary",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      limit: req.query.limit,
    });

    const userId = req.user?.id || req.userId;
    if (!userId) {
      console.warn("Get BOQ gaps summary failed: Authentication required", {
        endpoint: "/users/website/boq-gaps/summary",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const safeLimit = Math.min(
      200,
      200,
      Math.max(1, parseInt(req.query.limit) || 50),
    );

    const summary = await BoqCatalogGap.aggregate([
      { $match: { status: { $in: ["pending", "in_review", "sourcing"] } } },
      {
        $group: {
          _id: {
            item: "$boqItemNormalized",
            category: "$boqCategory",
          },
          displayName: { $first: "$boqItem" },
          totalRequests: { $sum: "$requestCount" },
          totalQuantity: { $sum: "$quantity" },
          avgPrice: { $avg: "$estimatedUnitPrice" },
          uniqueCustomers: { $addToSet: "$customerId" },
          brands: { $addToSet: "$boqBrand" },
          cities: { $addToSet: "$city" },
          lastRequestedAt: { $max: "$lastRequestedAt" },
        },
      },
      {
        $project: {
          _id: 0,
          item: "$_id.item",
          category: "$_id.category",
          displayName: 1,
          totalRequests: 1,
          totalQuantity: 1,
          avgPrice: 1,
          uniqueCustomerCount: { $size: "$uniqueCustomers" },
          brands: {
            $filter: { input: "$brands", as: "b", cond: { $ne: ["$$b", ""] } },
          },
          cities: {
            $filter: { input: "$cities", as: "c", cond: { $ne: ["$$c", ""] } },
          },
          lastRequestedAt: 1,
        },
      },
      { $sort: { totalRequests: -1, totalQuantity: -1 } },
      { $limit: safeLimit },
    ]);

    console.log("Get BOQ gaps summary successful", {
      endpoint: "/users/website/boq-gaps/summary",
      ip: req._remoteAddress,
      userId,
      count: summary.length,
    });

    res.json({ success: true, items: summary });
  } catch (err) {
    console.error("Get BOQ gaps summary error", {
      endpoint: "/users/website/boq-gaps/summary",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[boq-gaps/summary] error", err);
    res.status(500).json({ success: false, error: "Failed to build summary" });
  }
};

/**
 * PATCH /api/users/website/boq-gaps/:id
 */
const updateBoqGap = async (req, res) => {
  try {
    console.log("Update BOQ gap attempt", {
      endpoint: "/users/website/boq-gaps/:id",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      gapId: req.params.id,
    });

    const userId = req.user?.id || req.userId;
    if (!userId) {
      console.warn("Update BOQ gap failed: Authentication required", {
        endpoint: "/users/website/boq-gaps/:id",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { status, adminNotes, assignedTo } = req.body || {};
    const update = {};

    if (
      status &&
      ["pending", "in_review", "sourcing", "added", "ignored"].includes(status)
    ) {
      update.status = status;
      if (status === "added" || status === "ignored") {
        update.resolvedAt = new Date();
      }
    }
    if (typeof adminNotes === "string")
      update.adminNotes = adminNotes.trim().slice(0, 5000);
    if (assignedTo) update.assignedTo = assignedTo;

    if (Object.keys(update).length === 0) {
      console.warn("Update BOQ gap failed: No valid fields to update", {
        endpoint: "/users/website/boq-gaps/:id",
        ip: req._remoteAddress,
        userId,
        gapId: req.params.id,
      });
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }

    const doc = await BoqCatalogGap.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    );

    if (!doc) {
      console.warn("Update BOQ gap failed: Gap not found", {
        endpoint: "/users/website/boq-gaps/:id",
        ip: req._remoteAddress,
        userId,
        gapId: req.params.id,
      });
      return res.status(404).json({ success: false, message: "Gap not found" });
    }

    console.log("Update BOQ gap successful", {
      endpoint: "/users/website/boq-gaps/:id",
      ip: req._remoteAddress,
      userId,
      gapId: req.params.id,
    });

    res.json({ success: true, item: doc });
  } catch (err) {
    console.error("Update BOQ gap error", {
      endpoint: "/users/website/boq-gaps/:id",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      gapId: req.params.id,
      error: err.message,
      stack: err.stack,
    });
    console.error("[boq-gaps PATCH] error", err);
    res.status(500).json({ success: false, error: "Failed to update gap" });
  }
};

// NEW: Delete endpoint
const deleteBoqGap = async (req, res) => {
  try {
    console.log("Delete BOQ gap attempt", {
      endpoint: "/users/website/boq-gaps/:id",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      gapId: req.params.id,
    });

    const userId = req.user?.id || req.userId;
    if (!userId) {
      console.warn("Delete BOQ gap failed: Authentication required", {
        endpoint: "/users/website/boq-gaps/:id",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const doc = await BoqCatalogGap.findByIdAndDelete(req.params.id);
    if (!doc) {
      console.warn("Delete BOQ gap failed: Gap not found", {
        endpoint: "/users/website/boq-gaps/:id",
        ip: req._remoteAddress,
        userId,
        gapId: req.params.id,
      });
      return res.status(404).json({ success: false, message: "Gap not found" });
    }

    console.log("Delete BOQ gap successful", {
      endpoint: "/users/website/boq-gaps/:id",
      ip: req._remoteAddress,
      userId,
      gapId: req.params.id,
    });

    res.json({ success: true, message: "Gap deleted" });
  } catch (err) {
    console.error("Delete BOQ gap error", {
      endpoint: "/users/website/boq-gaps/:id",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      gapId: req.params.id,
      error: err.message,
      stack: err.stack,
    });
    console.error("[boq-gaps DELETE] error", err);
    res.status(500).json({ success: false, error: "Failed to delete gap" });
  }
};

module.exports = {
  logBoqGaps,
  getBoqGaps,
  getBoqGapsSummary,
  updateBoqGap,
  deleteBoqGap,
  normalize,
};
