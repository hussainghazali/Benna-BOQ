// /api/users — auth + BOQ surface (standalone port of content.routes.js
// BOQ/credits block).
const express = require("express");
const router = express.Router();

const AUTH = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  authLimiter,
  boqLimiter,
  feedbackLimiter,
  creditPurchaseLimiter,
} = require("../middleware/rateLimit");
const { preventReplayAttack } = require("../helpers/paytabsWebhook");
const AUTH_CONTROLLER = require("../app/auth/controller/auth.controller");
const CREDITS_CONTROLLER = require("../app/user/controller/credits.controller");
const BOQ_PROJECT_CONTROLLER = require("../app/user/controller/boqProject.controller");
const BOQ_ACTIVITY_CONTROLLER = require("../app/user/controller/boqActivity.controller");
const BOQ_FEEDBACK_CONTROLLER = require("../app/user/controller/boqFeedback.controller");
const BOQ_GAPS_CONTROLLER = require("../app/user/controller/boqGaps.controller");
const PRODUCT = require("../app/user/controller/product.controller");
const {
  createBOQProjectSchema,
  updateBOQProjectSchema,
  boqFeedbackSchema,
  boqGapsLogSchema,
  boqActivitySchema,
} = require("../validation/boqSchemas");
const {
  creditPurchaseSchema,
  creditDeductSchema,
  creditTransactionQuerySchema,
} = require("../validation/creditSchemas");

// Auth
router.post("/auth/registration", authLimiter, AUTH_CONTROLLER.register);
router.post("/auth/customer/registration", authLimiter, AUTH_CONTROLLER.register);
router.post("/auth/customer/login", authLimiter, AUTH_CONTROLLER.login);
router.get("/auth/customer/me", AUTH.authenticate, AUTH_CONTROLLER.me);

// ==================== Website surface ====================
const website = router;

// Product detail + search (public, parity with storefront)
website.get("/website/products/:slug", PRODUCT.getBySlug);
website.get("/website/search", PRODUCT.search);

// BOQ Projects
website.post(
  "/website/boq-projects",
  AUTH.authenticate,
  boqLimiter,
  validate(createBOQProjectSchema),
  CREDITS_CONTROLLER.createBOQProject,
);
website.get(
  "/website/boq-projects",
  AUTH.authenticate,
  BOQ_PROJECT_CONTROLLER.getUserBOQProjects,
);
website.get(
  "/website/boq-projects/:projectId",
  AUTH.authenticate,
  BOQ_PROJECT_CONTROLLER.getBOQProjectById,
);
website.put(
  "/website/boq-projects/:projectId",
  AUTH.authenticate,
  validate(updateBOQProjectSchema),
  BOQ_PROJECT_CONTROLLER.updateBOQProject,
);
website.delete(
  "/website/boq-projects/:projectId",
  AUTH.authenticate,
  BOQ_PROJECT_CONTROLLER.deleteBOQProject,
);

// Credits
website.get(
  "/website/:customerId/credits",
  AUTH.authenticate,
  CREDITS_CONTROLLER.getCredits,
);
website.get(
  "/website/:customerId/credit-transactions",
  AUTH.authenticate,
  validate(creditTransactionQuerySchema, "query"),
  CREDITS_CONTROLLER.getCreditTransactions,
);
website.post(
  "/website/:customerId/credits/deduct",
  AUTH.authenticate,
  validate(creditDeductSchema),
  CREDITS_CONTROLLER.deductCredits,
);
website.post(
  "/website/credits/purchase",
  AUTH.authenticate,
  creditPurchaseLimiter,
  validate(creditPurchaseSchema),
  CREDITS_CONTROLLER.createCreditPurchase,
);
website.post(
  "/website/credits/paytabs/callback",
  preventReplayAttack,
  CREDITS_CONTROLLER.paytabsCallback,
);

// BOQ Feedback / Gaps / Activity
website.post(
  "/website/boq-feedback",
  AUTH.authenticate,
  feedbackLimiter,
  validate(boqFeedbackSchema),
  BOQ_FEEDBACK_CONTROLLER.submitFeedback,
);
website.post(
  "/website/boq-gaps/log",
  AUTH.authenticate,
  validate(boqGapsLogSchema),
  BOQ_GAPS_CONTROLLER.logBoqGaps,
);
website.post(
  "/website/boq-activity",
  AUTH.authenticate,
  feedbackLimiter,
  validate(boqActivitySchema),
  BOQ_ACTIVITY_CONTROLLER.logActivity,
);

module.exports = router;
