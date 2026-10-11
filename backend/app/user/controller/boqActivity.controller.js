// app/user/controller/boqActivity.controller.js
const BoqActivity = require("../model/boqActivity.model");

// Analytics-only sink for the BOQ build-project flow. Fire-and-forget on the
// client (api-boq-activity.ts catches its own errors), so failures here never
// surface to the customer — but we still log server-side and return a real
// status code so this endpoint's health is visible in server logs/monitoring.
const logActivity = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const {
      customerId,
      boqId,
      event,
      projectInputs,
      totalEstimate,
      itemsCount,
      matchedCount,
      addedToCartItems,
      feedback,
      metadata,
    } = req.body;

    await BoqActivity.create({
      customerId: customerId || (userId ? String(userId) : null),
      boqId,
      event,
      projectInputs: projectInputs || null,
      totalEstimate: totalEstimate ?? null,
      itemsCount: itemsCount ?? null,
      matchedCount: matchedCount ?? null,
      addedToCartItems: addedToCartItems || undefined,
      feedback: feedback || undefined,
      metadata: metadata || null,
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Log BOQ activity error", {
      endpoint: "/users/website/boq-activity",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ success: false, message: "Failed to log activity" });
  }
};

module.exports = { logActivity };
