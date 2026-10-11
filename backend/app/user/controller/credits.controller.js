const mongoose = require("mongoose");
const axios = require("axios");
const {
  restrictToInstantMethods,
} = require("../../../helpers/offlinePayments");
const UserCredits = require("../model/userCredits.model");
const CreditTransaction = require("../model/creditTransaction.model");
const BOQProject = require("../model/boqProject.model");
// const logger = require("../../../helpers/logger");

// ===== PACKAGE CONFIG =====
// Rolled back to the original 5-package lineup — the "4 packages" spec was
// an unconfirmed recollection, not an actual product decision. free_50 is
// still claimable exactly once ever (see grantFreeBOQsIfEligible below) —
// that rule came from the same conversation but wasn't tied to the specific
// package amounts, so it stays.
const PACKAGES = {
  free_50: { credits: 50, price: 0, free: true },
  boq_100: { credits: 100, price: 10 },
  boq_250: { credits: 250, price: 25 },
  boq_500: { credits: 500, price: 50 },
  boq_1000: { credits: 1000, price: 100 },
};

const FREE_BOQ_ALLOWANCE = 50;

// ===== TRANSACTION GATE =====
// Multi-document Mongo transactions require a replica set / mongos. A plain
// standalone mongod (typical local/dev setup) throws "Transaction numbers are
// only allowed on a replica set member or mongos" the moment startTransaction()
// is called, which this file previously called unconditionally — the root
// cause of 500s on BOQ credit deduction/project creation in dev. Real
// transactions now only run in production; elsewhere we still open a client
// session (safe on any topology, MongoDB 3.6+) and use it to tag queries via
// .session(), but skip start/commit/abort so the writes just run sequentially
// with no atomicity guarantee. That trade-off (no rollback-on-error in dev)
// is expected and matches how local/staging Mongo is actually deployed here.
const USE_TRANSACTIONS = process.env.NODE_ENV === "production";

const startTxn = (session) => {
  if (USE_TRANSACTIONS) session.startTransaction();
};
const commitTxn = async (session) => {
  if (USE_TRANSACTIONS) await session.commitTransaction();
};
const abortTxn = async (session) => {
  if (USE_TRANSACTIONS) await session.abortTransaction();
};

// ===== ENV CONFIG =====
const PAYTABS_PROFILE_ID = process.env.PAYTABS_PROFILE_ID;
const PAYTABS_SERVER_KEY = process.env.PAYTABS_SERVER_KEY;
const PAYTABS_BASE_URL =
  process.env.PAYTABS_BASE_URL || "https://secure.paytabs.sa";
const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  process.env.PUBLIC_WEB_URL ||
  "https://store.benna.com.sa";
const _apiBase =
  process.env.CREDITS_CALLBACK_URL
    ? null
    : (process.env.API_BASE_URL || process.env.PUBLIC_API_URL || "").replace(/\/$/, "");
const CALLBACK_URL =
  process.env.CREDITS_CALLBACK_URL ||
  (_apiBase ? `${_apiBase}/api/users/website/credits/paytabs/callback` : null);

if (!PAYTABS_PROFILE_ID || !PAYTABS_SERVER_KEY) {
  console.error(
    "[CREDITS CONFIG ERROR] PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY must be set",
  );
}
if (!CALLBACK_URL || !CALLBACK_URL.startsWith("https://")) {
  console.error(
    "[CREDITS CONFIG ERROR] Invalid or missing credits callback URL. Set CREDITS_CALLBACK_URL or API_BASE_URL/PUBLIC_API_URL in .env",
  );
}

// ===== AUTHORIZATION HELPER =====
const authorizeCustomerId = (req, res, targetCustomerId) => {
  const authenticatedUserId = req.user?.id || req.user?._id?.toString();
  if (!authenticatedUserId) {
    res.status(401).json({ message: "Authentication required" });
    return false;
  }
  if (authenticatedUserId !== targetCustomerId) {
    res
      .status(403)
      .json({ message: "Unauthorized access to customer credits" });
    return false;
  }
  return true;
};

// Grants the 50 free BOQ credits exactly once, ever, per customer — per
// product spec (PM, 2026-07): once a customer's free 50 are used up, they can
// never claim free credits again, only buy a paid pack (100/200/500). This
// used to re-top a customer back to 50 whenever balance dropped below 50 and
// no "modern" free-grant transaction was on record — that was meant as a
// one-time backfill for pre-existing data, not an ongoing top-up, but it made
// the "never again" rule depend on transaction-history bookkeeping instead of
// being a hard, obvious rule. Simplified: brand-new customer (no UserCredits
// doc yet) gets the grant once; any existing doc is returned as-is, no matter
// how low the balance is.
const grantFreeBOQsIfEligible = async (customerId, session = null) => {
  let credits = await UserCredits.findOne({ customerId }).session(session);

  if (credits) return credits;

  credits = await UserCredits.create(
    [
      {
        customerId,
        balance: FREE_BOQ_ALLOWANCE,
        freeTrialUsed: true,
        totalPurchased: 0,
        totalUsed: 0,
      },
    ],
    session ? { session } : undefined,
  ).then((docs) => docs[0]);

  await CreditTransaction.create(
    [
      {
        customerId,
        type: "free_trial",
        amount: FREE_BOQ_ALLOWANCE,
        balanceAfter: FREE_BOQ_ALLOWANCE,
        description: `${FREE_BOQ_ALLOWANCE} free BOQ credits granted`,
        metadata: { source: "free_50_default" },
      },
    ],
    session ? { session } : undefined,
  );

  return credits;
};

// ===== GET USER CREDITS =====
const getCredits = async (req, res) => {
  try {
    console.log("Get credits attempt", {
      endpoint: "/users/website/:customerId/credits",
      ip: req._remoteAddress,
      customerId: req.params.customerId,
    });

    const { customerId } = req.params;

    if (!authorizeCustomerId(req, res, customerId)) return;

    let credits = await grantFreeBOQsIfEligible(customerId);

    // Check if subscription expired and clear it
    if (
      credits.subscriptionExpiresAt &&
      new Date() > new Date(credits.subscriptionExpiresAt)
    ) {
      credits.subscriptionPlan = null;
      credits.subscriptionExpiresAt = null;
      await UserCredits.updateOne(
        { customerId },
        { $set: { subscriptionPlan: null, subscriptionExpiresAt: null } },
      );
    }

    console.log("Get credits successful", {
      endpoint: "/users/website/:customerId/credits",
      ip: req._remoteAddress,
      customerId,
      balance: credits.balance,
    });

    return res.json({
      customerId: credits.customerId,
      balance: credits.balance,
      freeTrialUsed: credits.freeTrialUsed,
      totalPurchased: credits.totalPurchased,
      totalUsed: credits.totalUsed,
      subscriptionPlan: credits.subscriptionPlan,
      subscriptionExpiresAt: credits.subscriptionExpiresAt,
      isUnlimited:
        credits.subscriptionPlan?.includes("business") &&
        credits.subscriptionExpiresAt &&
        new Date() <= new Date(credits.subscriptionExpiresAt),
    });
  } catch (err) {
    console.error("Get credits error", {
      endpoint: "/users/website/:customerId/credits",
      ip: req._remoteAddress,
      customerId: req.params.customerId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[CREDITS ERROR]", err);
    res.status(500).json({ message: "Failed to fetch credits" });
  }
};

// ===== DEDUCT CREDIT (Atomic) =====
const deductCredits = async (req, res) => {
  const session = await mongoose.startSession();
  startTxn(session);

  try {
    console.log("Deduct credits attempt", {
      endpoint: "/users/website/:customerId/credits/deduct",
      ip: req._remoteAddress,
      customerId: req.params.customerId,
    });

    const { customerId } = req.params;

    if (!authorizeCustomerId(req, res, customerId)) {
      await abortTxn(session);
      session.endSession();
      return;
    }

    await grantFreeBOQsIfEligible(customerId, session);

    // Atomic find-and-update to prevent race conditions
    const updateResult = await UserCredits.findOneAndUpdate(
      {
        customerId,
        $or: [
          { balance: { $gt: 0 } },
          {
            subscriptionPlan: { $regex: /^business_/ },
            subscriptionExpiresAt: { $gt: new Date() },
          },
        ],
      },
      {
        $inc: { balance: -1, totalUsed: 1 },
      },
      { new: true, session, lean: true },
    );

    if (!updateResult) {
      console.warn("Deduct credits failed: Insufficient credits", {
        endpoint: "/users/website/:customerId/credits/deduct",
        ip: req._remoteAddress,
        customerId,
      });
      await abortTxn(session);
      session.endSession();
      return res.status(402).json({
        message: "Insufficient credits",
        code: "INSUFFICIENT_CREDITS",
      });
    }

    // If subscription is active, restore the balance (unlimited plan)
    if (
      updateResult.subscriptionPlan?.includes("business") &&
      updateResult.subscriptionExpiresAt &&
      new Date() <= new Date(updateResult.subscriptionExpiresAt)
    ) {
      await UserCredits.updateOne(
        { customerId },
        { $inc: { balance: 1 } }, // Restore the deducted credit
        { session },
      );
    }

    // Record transaction
    const finalBalance =
      updateResult.subscriptionPlan?.includes("business") &&
      updateResult.subscriptionExpiresAt &&
      new Date() <= new Date(updateResult.subscriptionExpiresAt)
        ? updateResult.balance
        : updateResult.balance;

    await CreditTransaction.create(
      [
        {
          customerId,
          type: "usage",
          amount: -1,
          balanceAfter: finalBalance,
          description: "1 credit used for BOQ generation",
          metadata: { source: "boq_generation" },
        },
      ],
      { session },
    );

    await commitTxn(session);
    session.endSession();

    console.log("Deduct credits successful", {
      endpoint: "/users/website/:customerId/credits/deduct",
      ip: req._remoteAddress,
      customerId,
      finalBalance,
    });

    return res.json({
      balance: finalBalance,
      deducted: true,
      unlimited:
        updateResult.subscriptionPlan?.includes("business") &&
        updateResult.subscriptionExpiresAt &&
        new Date() <= new Date(updateResult.subscriptionExpiresAt),
    });
  } catch (err) {
    await abortTxn(session);
    session.endSession();
    console.error("Deduct credits error", {
      endpoint: "/users/website/:customerId/credits/deduct",
      ip: req._remoteAddress,
      customerId: req.params.customerId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[CREDITS ERROR]", err);
    res.status(500).json({ message: "Deduction failed" });
  }
};

// ===== INTERNAL ADD (Atomic) =====
const addCreditsInternal = async (
  customerId,
  amount,
  metadata = {},
  session = null,
) => {
  const ownSession = session || (await mongoose.startSession());
  if (!session) startTxn(ownSession);

  try {
    const credits = await UserCredits.findOneAndUpdate(
      { customerId },
      {
        $inc: { balance: amount, totalPurchased: amount },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session: ownSession,
        lean: true,
      },
    );

    await CreditTransaction.create(
      [
        {
          customerId,
          type: metadata.packageId ? "purchase" : "manual_adjustment",
          amount,
          balanceAfter: credits.balance,
          description: metadata.description || `${amount} credits added`,
          metadata,
        },
      ],
      { session: ownSession },
    );

    if (!session) {
      await commitTxn(ownSession);
      ownSession.endSession();
    }

    return credits;
  } catch (err) {
    if (!session) {
      await abortTxn(ownSession);
      ownSession.endSession();
    }
    throw err;
  }
};

// ===== CREATE PAYMENT =====
const createCreditPurchase = async (req, res) => {
  try {
    console.log("Create credit purchase attempt", {
      endpoint: "/users/website/credits/purchase",
      ip: req._remoteAddress,
      customerId: req.body.customerId,
      packageId: req.body.packageId,
      idempotencyKey: req.body.idempotencyKey,
    });

    const { customerId, packageId, idempotencyKey } = req.body;

    if (!CALLBACK_URL || !CALLBACK_URL.startsWith("https://")) {
      console.error("[CREDITS] Payment creation aborted: CALLBACK_URL is not configured correctly.", { CALLBACK_URL });
      return res.status(500).json({ message: "Payment gateway misconfiguration. Contact support." });
    }

    if (!authorizeCustomerId(req, res, customerId)) return;

    // Validate package
    const pkg = PACKAGES[packageId];
    if (!pkg) {
      console.warn("Create credit purchase failed: Invalid package", {
        endpoint: "/users/website/credits/purchase",
        ip: req._remoteAddress,
        customerId,
        packageId,
      });
      return res.status(400).json({ message: "Invalid package" });
    }

    if (pkg.free) {
      const existing = await UserCredits.findOne({ customerId }).lean();
      if (existing) {
        console.warn("Create credit purchase failed: Free trial already used", {
          endpoint: "/users/website/credits/purchase",
          ip: req._remoteAddress,
          customerId,
        });
        return res.status(409).json({
          success: false,
          code: "FREE_TRIAL_ALREADY_USED",
          message:
            "Your free 50 BOQs have already been claimed. Choose a paid credit pack to continue.",
          balance: existing.balance,
        });
      }

      const credits = await grantFreeBOQsIfEligible(customerId);
      return res.json({
        success: true,
        credited: true,
        balance: credits?.balance ?? FREE_BOQ_ALLOWANCE,
        credits: pkg.credits,
        packageId,
      });
    }

    // Validate idempotency key format
    if (
      !idempotencyKey ||
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length < 10
    ) {
      console.warn("Create credit purchase failed: Invalid idempotency key", {
        endpoint: "/users/website/credits/purchase",
        ip: req._remoteAddress,
        customerId,
      });
      return res
        .status(400)
        .json({ message: "Valid idempotency key required" });
    }

    // Check for duplicate idempotency key (prevent double purchase requests)
    const existingTransaction = await CreditTransaction.findOne({
      "metadata.idempotencyKey": idempotencyKey,
    }).lean();

    if (existingTransaction) {
      console.warn("Create credit purchase failed: Duplicate request", {
        endpoint: "/users/website/credits/purchase",
        ip: req._remoteAddress,
        customerId,
        idempotencyKey,
      });
      return res.status(409).json({
        message: "Duplicate purchase request",
        transactionId: existingTransaction._id,
      });
    }

    const cart_id = `credits::${packageId}::${customerId}::${idempotencyKey}`;

    const payload = {
      profile_id: parseInt(PAYTABS_PROFILE_ID, 10),
      tran_type: "sale",
      tran_class: "ecom",
      cart_id,
      cart_description: `Credits Purchase - ${packageId}`,
      cart_currency: "SAR",
      cart_amount: pkg.price,
      callback: CALLBACK_URL,
      return: `${FRONTEND_URL}/payment-success?credits=${pkg.credits === -1 ? "unlimited" : pkg.credits}&package=${packageId}`,
      customer_details: {
        name: req.user?.fullName || "Customer",
        email: req.user?.email || "customer@benna.com.sa",
        phone: req.user?.phoneNumber || "",
      },
    };

    const response = await axios.post(
      `${PAYTABS_BASE_URL}/payment/request`,
      // Restrict this pay page to synchronous methods only. Credits,
      // subscriptions and promotions grant their benefit on callback and have
      // no concept of waiting days for an offline bill to settle. SADAD is
      // enabled per-MERCHANT on the PayTabs profile, not per-request, so once
      // it goes live it would otherwise appear here too.
      // No-op until PAYTABS_INSTANT_ONLY_METHODS is set.
      restrictToInstantMethods(payload),
      {
        headers: {
          Authorization: PAYTABS_SERVER_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    // Store pending idempotency key
    await CreditTransaction.create({
      customerId,
      type: "purchase",
      amount: 0,
      balanceAfter: 0,
      description: "Payment pending",
      metadata: {
        idempotencyKey,
        packageId,
        status: "pending",
        paytabsTranRef: response.data?.tran_ref,
      },
    });

    console.log("Create credit purchase successful", {
      endpoint: "/users/website/credits/purchase",
      ip: req._remoteAddress,
      customerId,
      packageId,
      tranRef: response.data?.tran_ref,
    });

    return res.json({
      redirect_url: response.data.redirect_url,
      tran_ref: response.data.tran_ref,
    });
  } catch (err) {
    console.error("Create credit purchase error", {
      endpoint: "/users/website/credits/purchase",
      ip: req._remoteAddress,
      customerId: req.body.customerId,
      packageId: req.body.packageId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[PAYMENT ERROR]", err.response?.data || err.message);
    res.status(500).json({
      message: "Payment creation failed",
      error: err.response?.data?.message || err.message,
    });
  }
};

// ===== CALLBACK =====
const paytabsCallback = async (req, res) => {
  const session = await mongoose.startSession();
  startTxn(session);

  try {
    // app.js routes any path containing "/paytabs/callback" (or
    // "/paytabs/save") through express.raw({type:"application/json"})
    // instead of express.json() — that's there for the signed order webhook,
    // whose verifyPayTabsSignature middleware HMACs the raw bytes and only
    // then does JSON.parse(). This credits callback route has no signature
    // middleware in its chain (see routes/content.routes.js — only
    // preventReplayAttack runs before this), so nothing ever turned the raw
    // Buffer back into an object here. req.body.cart_id was always
    // `undefined` regardless of what PayTabs actually sent — every real
    // callback 400'd as "Invalid credit payment". Parse it ourselves.
    if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body.toString() || "{}");
      } catch (parseErr) {
        console.error("Paytabs callback failed: Unparseable body", {
          endpoint: "/users/website/credits/paytabs/callback",
          ip: req._remoteAddress,
          error: parseErr.message,
        });
        await abortTxn(session);
        session.endSession();
        return res.status(400).json({ message: "Invalid request body" });
      }
    }

    console.log("Paytabs callback attempt", {
      endpoint: "/users/website/credits/paytabs/callback",
      ip: req._remoteAddress,
      cartId: req.body.cart_id,
      status: req.body.payment_result?.response_status,
    });

    const data = req.body;
    console.log("[PAYMENT CALLBACK] Received:", {
      cart_id: data.cart_id,
      status: data.payment_result?.response_status,
    });

    const { cart_id, payment_result, tran_ref } = data;

    if (!cart_id || !cart_id.startsWith("credits::")) {
      console.warn("Paytabs callback failed: Invalid credit payment", {
        endpoint: "/users/website/credits/paytabs/callback",
        ip: req._remoteAddress,
        cartId: cart_id,
      });
      await abortTxn(session);
      session.endSession();
      return res.status(400).json({ message: "Invalid credit payment" });
    }

    // Validate cart_id format
    const parts = cart_id.split("::");
    if (parts.length !== 4) {
      console.warn("Paytabs callback failed: Invalid cart_id format", {
        endpoint: "/users/website/credits/paytabs/callback",
        ip: req._remoteAddress,
        cartId: cart_id,
      });
      await abortTxn(session);
      session.endSession();
      return res.status(400).json({ message: "Invalid cart_id format" });
    }

    const [, packageId, customerId, idempotencyKey] = parts;

    // Check if already processed (idempotency)
    const existingSuccess = await CreditTransaction.findOne({
      "metadata.idempotencyKey": idempotencyKey,
      "metadata.status": "completed",
    })
      .session(session)
      .lean();

    if (existingSuccess) {
      console.log("Paytabs callback successful (already processed)", {
        endpoint: "/users/website/credits/paytabs/callback",
        ip: req._remoteAddress,
        idempotencyKey,
      });
      await commitTxn(session);
      session.endSession();
      return res.status(200).json({ message: "Already processed" });
    }

    if (payment_result?.response_status !== "A") {
      console.warn("Paytabs callback failed: Payment failed", {
        endpoint: "/users/website/credits/paytabs/callback",
        ip: req._remoteAddress,
        cartId: cart_id,
        status: payment_result?.response_status,
      });
      // Update pending transaction to failed
      await CreditTransaction.updateOne(
        { "metadata.idempotencyKey": idempotencyKey },
        {
          $set: {
            type: "purchase",
            description: "Payment failed",
            "metadata.status": "failed",
            "metadata.failureReason": payment_result?.response_message,
          },
        },
        { session },
      );

      await commitTxn(session);
      session.endSession();
      return res.status(400).json({ message: "Payment failed" });
    }

    const pkg = PACKAGES[packageId];
    if (!pkg) {
      console.warn("Paytabs callback failed: Invalid package", {
        endpoint: "/users/website/credits/paytabs/callback",
        ip: req._remoteAddress,
        packageId,
      });
      await abortTxn(session);
      session.endSession();
      return res.status(400).json({ message: "Invalid package" });
    }

    const creditsToAdd = pkg.credits === -1 ? 999999 : pkg.credits;

    // Add credits atomically
    const credits = await UserCredits.findOneAndUpdate(
      { customerId },
      {
        $inc: { balance: creditsToAdd, totalPurchased: creditsToAdd },
        ...(pkg.duration
          ? {
              subscriptionPlan: packageId,
              subscriptionExpiresAt: new Date(
                Date.now() + pkg.duration * 86400000,
              ),
            }
          : {}),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
        lean: true,
      },
    );

    // Update transaction to completed
    await CreditTransaction.findOneAndUpdate(
      { "metadata.idempotencyKey": idempotencyKey },
      {
        $set: {
          type: "purchase",
          amount: creditsToAdd,
          balanceAfter: credits.balance,
          description: `Purchased ${pkg.credits === -1 ? "unlimited" : creditsToAdd} credits - ${packageId}`,
          "metadata.status": "completed",
          "metadata.packageId": packageId,
          "metadata.paytabsTranRef": tran_ref,
        },
      },
      { session },
    );

    await commitTxn(session);
    session.endSession();

    console.log("Paytabs callback successful", {
      endpoint: "/users/website/credits/paytabs/callback",
      ip: req._remoteAddress,
      customerId,
      packageId,
      balance: credits.balance,
    });

    // Return what PayTabs expects
    return res.status(200).json({
      message: "Credits added successfully",
      balance: credits.balance,
      packageId,
    });
  } catch (err) {
    await abortTxn(session);
    session.endSession();
    console.error("Paytabs callback error", {
      endpoint: "/users/website/credits/paytabs/callback",
      ip: req._remoteAddress,
      cartId: req.body.cart_id,
      error: err.message,
      stack: err.stack,
    });
    console.error("[PAYMENT CALLBACK ERROR]", err);
    res.status(500).json({ message: "Callback processing failed" });
  }
};

// ===== GET CREDIT TRANSACTIONS =====
const getCreditTransactions = async (req, res) => {
  try {
    console.log("Get credit transactions attempt", {
      endpoint: "/users/website/:customerId/credits/transactions",
      ip: req._remoteAddress,
      customerId: req.params.customerId,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    const { customerId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!authorizeCustomerId(req, res, customerId)) return;

    const transactions = await CreditTransaction.find({ customerId })
      .sort({ createdAt: -1 })
      .skip(parseInt(offset, 10))
      .limit(parseInt(limit, 10))
      .lean();

    const total = await CreditTransaction.countDocuments({ customerId });

    console.log("Get credit transactions successful", {
      endpoint: "/users/website/:customerId/credits/transactions",
      ip: req._remoteAddress,
      customerId,
      count: transactions.length,
      total,
    });

    return res.json({
      transactions,
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (err) {
    console.error("Get credit transactions error", {
      endpoint: "/users/website/:customerId/credits/transactions",
      ip: req._remoteAddress,
      customerId: req.params.customerId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[CREDITS ERROR]", err);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};

// ===== CREATE BOQ (With Credit Check) =====
const createBOQProject = async (req, res) => {
  const session = await mongoose.startSession();
  startTxn(session);

  try {
    console.log("Create BOQ project attempt", {
      endpoint: "/users/website/credits/boq",
      ip: req._remoteAddress,
      customerId: req.body.customerId,
    });

    // req.user only ever has `_id` (see middleware/auth.js verifyToken — it
    // builds req.user as { _id, email, roleId }, never `.id`). req.user?.id
    // was always undefined here, so customerId fell through to undefined
    // whenever the client didn't explicitly send customerId in the body
    // (which is the normal case). authorizeCustomerId() below resolves the
    // *authenticated* user correctly via its own `_id` fallback, so the two
    // values never matched and every call 403'd as "Unauthorized access".
    const customerId =
      req.body.customerId || req.user?.id || req.user?._id?.toString() || req.userId;

    if (!authorizeCustomerId(req, res, customerId)) {
      await abortTxn(session);
      session.endSession();
      return;
    }

    // Ensure a credits record exists and the 50-free-BOQ allowance has been
    // granted, same as every other credits-aware endpoint (getCredits,
    // deductCredits already do this). Previously this queried UserCredits
    // directly — a brand-new customer with no doc yet read as balance 0 and
    // got an immediate 402 instead of their free allowance.
    const credits = await grantFreeBOQsIfEligible(customerId, session);

    const hasActiveSubscription =
      credits?.subscriptionPlan?.includes("business") &&
      credits?.subscriptionExpiresAt &&
      new Date() <= new Date(credits.subscriptionExpiresAt);
    const hasBalance = credits?.balance > 0;

    if (!hasActiveSubscription && !hasBalance) {
      console.warn("Create BOQ project failed: Insufficient credits", {
        endpoint: "/users/website/credits/boq",
        ip: req._remoteAddress,
        customerId,
      });
      await abortTxn(session);
      session.endSession();
      // UX: the "out of credits" message must match reality — a customer
      // who never bought a pack just used up their free 50 (their only free
      // shot, per product rule); a customer who's bought before ran out of
      // paid credits. Wrong wording here (e.g. always saying "free BOQs")
      // is exactly the kind of message mismatch that confuses customers.
      const stillOnFreeAllotment = (credits?.totalPurchased ?? 0) === 0;
      return res.status(402).json({
        message: stillOnFreeAllotment
          ? "Your 50 free BOQs are used. Choose a credit pack to continue."
          : "You're out of credits. Choose a credit pack to continue.",
        code: "INSUFFICIENT_CREDITS",
      });
    }

    // Deduct credit if not unlimited
    if (!hasActiveSubscription) {
      await UserCredits.updateOne(
        { customerId },
        { $inc: { balance: -1, totalUsed: 1 } },
        { session },
      );

      await CreditTransaction.create(
        [
          {
            customerId,
            type: "usage",
            amount: -1,
            balanceAfter: credits.balance - 1,
            description: "1 credit used for BOQ project creation",
            metadata: { source: "boq_project_creation", projectData: req.body },
          },
        ],
        { session },
      );
    }

    // customerId is deliberately never accepted from req.body (client-supplied
    // customerId would let a customer create projects under someone else's
    // account) — it's the server-resolved value from the authenticated
    // session, injected here explicitly. req.body only carries the
    // Joi-validated project fields (projectName, projectType, city, areaSqm,
    // floors, specifications, boqResult, estimatedCost).
    const project = await BOQProject.create(
      [{ ...req.body, customerId }],
      { session },
    );

    await commitTxn(session);
    session.endSession();

    console.log("Create BOQ project successful", {
      endpoint: "/users/website/credits/boq",
      ip: req._remoteAddress,
      customerId,
      projectId: project[0]._id,
    });

    return res.json(project[0]);
  } catch (err) {
    await abortTxn(session);
    session.endSession();
    console.error("Create BOQ project error", {
      endpoint: "/users/website/credits/boq",
      ip: req._remoteAddress,
      customerId: req.body.customerId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[BOQ ERROR]", err);
    res.status(500).json({ message: "Failed to create project" });
  }
};

// ===== GET BOQ =====
const getBOQProjects = async (req, res) => {
  try {
    console.log("Get BOQ projects attempt", {
      endpoint: "/users/website/:customerId/credits/boq",
      ip: req._remoteAddress,
      customerId: req.params.customerId,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    const { customerId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!authorizeCustomerId(req, res, customerId)) return;

    const projects = await BOQProject.find({ customerId })
      .sort({ createdAt: -1 })
      .skip(parseInt(offset, 10))
      .limit(parseInt(limit, 10))
      .lean();

    const total = await BOQProject.countDocuments({ customerId });

    console.log("Get BOQ projects successful", {
      endpoint: "/users/website/:customerId/credits/boq",
      ip: req._remoteAddress,
      customerId,
      count: projects.length,
      total,
    });

    return res.json({
      projects,
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (err) {
    console.error("Get BOQ projects error", {
      endpoint: "/users/website/:customerId/credits/boq",
      ip: req._remoteAddress,
      customerId: req.params.customerId,
      error: err.message,
      stack: err.stack,
    });
    console.error("[BOQ ERROR]", err);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
};

module.exports = {
  getCredits,
  deductCredits,
  createCreditPurchase,
  paytabsCallback,
  createBOQProject,
  getBOQProjects,
  getCreditTransactions,
  addCreditsInternal,
};
