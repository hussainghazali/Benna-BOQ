/**
 * Classification for asynchronous ("offline") payment methods — currently
 * SADAD.
 *
 * Deliberately dependency-free so it can be unit-tested without booting the
 * payment controller's dependency graph (mongoose models, firebase, mailers).
 * The guarantee this module encodes — that no card transaction can ever be
 * routed into the asynchronous code path — is the single most important
 * property of the SADAD integration, and it needs cheap, fast tests.
 */

// SADAD does not settle during the checkout redirect. PayTabs collects the
// customer's phone number on its hosted page, issues a bill reference, and
// returns response_status "P" (pending at the acquirer). The customer pays
// from their bank app minutes-to-days later, at which point PayTabs sends a
// SECOND callback — same tran_ref — with status "A".
//
// The customer chooses the method on the PayTabs page, so we never know up
// front which one they will pick; we only learn it from the callback payload.
//
// This set is deliberately narrow. Any method not listed keeps the pre-SADAD
// behaviour, which is what guarantees the card path is untouched.
//
// ⚠️ These are TOKENS matched inside the method string, not exact values.
// A real transaction against the live profile returned:
//
//     payment_info.payment_method = "SADAD (IFS)"
//
// not "sadad". Exact-equality matching silently failed to classify it, which
// would have sent a genuine SADAD payment down the failure branch — cancelling
// the order and releasing its stock while the customer held a live bill. The
// acquirer name can vary (IFS is the SADAD operator), so match on the token.
const ASYNC_PAYMENT_METHODS = new Set(["sadad"]);
const ASYNC_PENDING_STATUSES = new Set(["P", "H"]);

// FALLBACK ONLY. Prefer the expiry PayTabs actually returns — see
// extractOfflineBillExpiry below. This is used only when the payload carries
// no expiry at all.
//
// 48 was a guess. The first real bill (tran_ref PTS2624466754255, issued
// 2026-09-01T19:15:18Z) expired 2026-09-02T19:15Z — exactly 24 hours. Holding
// stock for 48h against a 24h bill also means telling the customer they can
// still pay for a full day after the bill is dead.
const SADAD_BILL_TTL_HOURS = Number(process.env.SADAD_BILL_TTL_HOURS) || 24;

const normalizeMethod = (raw) => String(raw || "").trim().toLowerCase();

/**
 * Does this PayTabs method string denote an asynchronous method?
 *
 * Matches on word boundaries so "SADAD (IFS)", "Sadad", and "sadad" all
 * classify, while an unrelated method that merely contains the letters cannot.
 *
 * @param {string} raw the raw payment_info.payment_method value
 */
const matchesAsyncMethod = (raw) => {
  const method = normalizeMethod(raw);
  if (!method) return false;
  // Split on anything that is not a letter or digit: "sadad (ifs)" → [sadad, ifs]
  const tokens = method.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some((tokenValue) => ASYNC_PAYMENT_METHODS.has(tokenValue));
};

/**
 * Should this callback be treated as "bill issued, money not yet moved"?
 *
 * Returns false for every card payment, which is what keeps the existing
 * confirmation and failure paths byte-identical to their pre-SADAD behaviour.
 *
 * @param {object} paytabsData raw PayTabs callback / query payload
 * @param {(msg: string, meta: object) => void} [warn] injected logger
 */
const isAsyncPendingCallback = (paytabsData, warn = console.warn) => {
  const status = String(
    paytabsData?.payment_result?.response_status || "",
  ).toUpperCase();
  if (!ASYNC_PENDING_STATUSES.has(status)) return false;

  const rawMethod = paytabsData?.payment_info?.payment_method;
  if (matchesAsyncMethod(rawMethod)) return true;
  const method = normalizeMethod(rawMethod);

  // A pending/hold status on a method we have not classified as asynchronous.
  // Pre-SADAD this fell through to "failed", which cancels the order and
  // restores its stock. That is very likely wrong — but changing it blindly
  // would alter live card behaviour, so we preserve it and surface the case
  // instead, so it can be classified deliberately with real data in hand.
  warn(
    "[paytabs] pending/hold status on UNCLASSIFIED payment method — " +
      "falling back to existing (failure) handling",
    {
      tran_ref: paytabsData?.tran_ref,
      cart_id: paytabsData?.cart_id,
      response_status: status,
      payment_method: method || "(empty)",
    },
  );
  return false;
};

// ✅ CONFIRMED FROM A LIVE TRANSACTION — tran_ref PTS2624466754255,
// profile 111753, 2026-09-01. The SADAD bill number the customer sees on the
// PayTabs page ("1016300121") arrives in TWO places:
//
//     payment_result.acquirer_ref  : "1016300121"   ← authoritative
//     payment_result.response_code : "1016300121"   ← mirror
//
// and in NEITHER of the places the original implementation looked first. It is
// not `payment_info.bill_number`, which does not exist on this profile.
//
// 🔴 What the old guess-list did instead: it fell through to
// `payment_info.payment_description` — which holds "Sadad (IFS)", the METHOD
// LABEL — and stored that as the customer's payment reference. Order
// BENNA-ORD-20260901-000040 carries `billNumber: "Sadad (IFS)"` in production
// because of it. A confident-looking value that no bank will accept is worse
// than an empty one, because empty is detectable and this was not.
//
// `acquirer_ref` is read first because it is the semantically correct carrier;
// `response_code` is kept as a mirror in case PayTabs stops overloading it.
// Both are shape-checked: on an ordinary decline `response_code` is "300",
// which cannot pass MIN_BILL_DIGITS and so can never be mistaken for a bill.
const MIN_BILL_DIGITS = 6;

/**
 * Does this value look like a payable bill reference rather than a label or a
 * status code? "1016300121" passes. "Sadad (IFS)" and "300" do not.
 */
const looksLikeBillReference = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return new RegExp("\\d{" + MIN_BILL_DIGITS + ",}").test(text);
};

const OFFLINE_BILL_FIELD_CANDIDATES = [
  (d) => d?.payment_result?.acquirer_ref,
  (d) => d?.payment_result?.response_code,
];


const extractOfflineBillNumber = (paytabsData, error = console.error) => {
  const rejected = [];

  for (const read of OFFLINE_BILL_FIELD_CANDIDATES) {
    let value;
    try {
      value = read(paytabsData);
    } catch {
      continue;
    }
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    if (looksLikeBillReference(trimmed)) return trimmed;
    // A populated field that cannot be a reference. Surfaced deliberately —
    // this is how the payment_description bug was caught.
    rejected.push(trimmed);
  }

  error(
    "[paytabs] async payment pending but NO usable bill reference found — " +
      "customer cannot pay. Inspect this payload and update " +
      "OFFLINE_BILL_FIELD_CANDIDATES.",
    {
      tran_ref: paytabsData?.tran_ref,
      cart_id: paytabsData?.cart_id,
      rejectedCandidates: rejected,
      payloadKeys: Object.keys(paytabsData || {}),
      paymentInfoKeys: Object.keys(paytabsData?.payment_info || {}),
      paymentResultKeys: Object.keys(paytabsData?.payment_result || {}),
    },
  );
  return "";
};

// The bill's real expiry belongs to SADAD, not to us. Computing it from a
// constant means our deadline and the gateway's disagree — and the customer
// believes ours, because it is the one in their email and on their order page.
// Read it from the payload wherever PayTabs provides it.
const OFFLINE_BILL_EXPIRY_FIELD_CANDIDATES = [
  (d) => d?.payment_info?.expiry_date,
  (d) => d?.payment_info?.bill_expiry,
  (d) => d?.payment_info?.expires_at,
  (d) => d?.payment_result?.expiry_date,
  (d) => d?.bill_expiry_date,
  (d) => d?.expiry_date,
];

/**
 * @param {object} paytabsData raw callback / query payload
 * @param {Date}   issuedAt    when we saw the bill issued
 * @returns {{expiresAt: Date, source: "gateway"|"ttl_fallback"}}
 */
const extractOfflineBillExpiry = (paytabsData, issuedAt = new Date()) => {
  for (const read of OFFLINE_BILL_EXPIRY_FIELD_CANDIDATES) {
    let value;
    try {
      value = read(paytabsData);
    } catch {
      continue;
    }
    if (!value) continue;
    const parsed = new Date(value);
    // Must parse, and must be after issue — otherwise it is some other date
    // field that happened to match one of these names.
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getTime() > issuedAt.getTime()
    ) {
      return { expiresAt: parsed, source: "gateway" };
    }
  }

  return {
    expiresAt: new Date(
      issuedAt.getTime() + SADAD_BILL_TTL_HOURS * 60 * 60 * 1000,
    ),
    source: "ttl_fallback",
  };
};

/**
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * PayTabs enables SADAD per MERCHANT PROFILE, not per request. The moment it
 * is switched on for our profile, SADAD appears on *every* pay page we mint —
 * including the four that must never accept it:
 *
 *     vendor credits · feature subscriptions · category & product promotions
 *
 * Those four grant their benefit the instant the callback arrives. They have
 * no concept of "wait three days for the bill to be paid", so a vendor paying
 * by SADAD would either get the benefit for free or have their money sit in
 * limbo. (Customer checkout and quote-payments DO handle waiting, and so are
 * deliberately not routed through this function.)
 *
 * ── How SADAD is hidden ────────────────────────────────────────────────────
 *
 * PayTabs' `payment_methods` parameter accepts an EXCLUSION form as well as a
 * whitelist: `["all", "-sadad"]` means "every method configured on this
 * profile, except SADAD".
 *
 *   https://docs.paytabs.com/manuals/PT-API-Endpoints/Integration-Types-Manuals/
 *     Request-Response-Parameters/Request-Parameter-Payment-Methods/
 *
 * This matters a great deal. The obvious alternative — enumerating the methods
 * we want to KEEP — requires knowing exactly which ones are enabled on the
 * profile, and any we forget are silently removed from those pay pages. That
 * breaks a payment option which works today in order to pre-empt a problem
 * that does not exist yet. The exclusion form cannot do that: "all" resolves
 * on PayTabs' side against the live profile, so the page is identical to
 * today's minus the one method we are removing.
 *
 * ── The env var ────────────────────────────────────────────────────────────
 *
 * PAYTABS_INSTANT_ONLY_METHODS is now only an override, not a prerequisite:
 *
 *   unset (default)     → ["all", "-sadad"]  ← what production should run
 *   "off" | "none"      → null, parameter omitted entirely. Kill switch: if
 *                         PayTabs ever rejects the exclusion form on this
 *                         profile, this restores the exact pre-SADAD request
 *                         without a deploy. SADAD leaks back onto these pages
 *                         while it is set, so treat it as an incident, not a
 *                         setting.
 *   "creditcard,mada"   → explicit whitelist, sadad stripped. The fallback if
 *                         the exclusion form is unsupported and we would
 *                         rather lose an exotic method than accept SADAD here.
 *
 * @returns {string[]|null} null means "omit the parameter entirely"
 */
const INSTANT_ONLY_DISABLED_VALUES = new Set(["off", "none", "false", "0"]);

const getInstantOnlyMethods = () => {
  const raw = String(process.env.PAYTABS_INSTANT_ONLY_METHODS || "").trim();

  // Explicit kill switch — omit the parameter and behave exactly as pre-SADAD.
  if (INSTANT_ONLY_DISABLED_VALUES.has(raw.toLowerCase())) return null;

  // Default: exclude SADAD from whatever the profile has configured.
  if (!raw) {
    return ["all", ...[...ASYNC_PAYMENT_METHODS].map((m) => `-${m}`)];
  }

  const methods = raw
    .split(",")
    .map((m) => normalizeMethod(m))
    .filter(Boolean)
    // Defence in depth: an offline method must never survive into this list,
    // however it got into the env var.
    .filter((m) => !matchesAsyncMethod(m));
  return methods.length ? methods : null;
};

/**
 * Restrict a PayTabs pay-page payload so it cannot offer an asynchronous
 * method. Wrap the payload at the call site:
 *
 *     axios.post(url, restrictToInstantMethods(payload), { headers })
 *
 * Returns the payload untouched only when the kill switch is set.
 */
const restrictToInstantMethods = (payload) => {
  const methods = getInstantOnlyMethods();
  return methods ? { ...payload, payment_methods: methods } : payload;
};

module.exports = {
  ASYNC_PAYMENT_METHODS,
  ASYNC_PENDING_STATUSES,
  SADAD_BILL_TTL_HOURS,
  normalizeMethod,
  matchesAsyncMethod,
  isAsyncPendingCallback,
  extractOfflineBillNumber,
  extractOfflineBillExpiry,
  looksLikeBillReference,
  getInstantOnlyMethods,
  restrictToInstantMethods,
};
