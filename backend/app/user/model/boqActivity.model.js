// models/boqActivity.model.js
// Lightweight event log for the BOQ build-project flow (generation, cart adds,
// feedback, CSV export, product swaps). Analytics-only — never blocks the
// client (see api-boq-activity.ts on the frontend, which swallows failures).
const mongoose = require("mongoose");

const BoqActivitySchema = new mongoose.Schema(
  {
    customerId: { type: String, index: true, default: null },
    boqId: {
      type: String,
      required: [true, "boqId is required"],
      trim: true,
      index: true,
    },
    event: {
      type: String,
      required: [true, "event is required"],
      enum: [
        "generated",
        "add_to_cart_row",
        "add_all_to_cart",
        "feedback",
        "csv_export",
        "swap_product",
      ],
      index: true,
    },
    projectInputs: { type: mongoose.Schema.Types.Mixed, default: null },
    totalEstimate: { type: Number, default: null },
    itemsCount: { type: Number, default: null },
    matchedCount: { type: Number, default: null },
    addedToCartItems: {
      type: [
        {
          productId: { type: String },
          quantity: { type: Number },
          _id: false,
        },
      ],
      default: undefined,
    },
    feedback: {
      type: {
        accuracyRating: { type: Number },
        pricingRating: { type: Number },
        improvements: { type: [String], default: undefined },
        comment: { type: String, trim: true, maxlength: 5000 },
      },
      default: undefined,
      _id: false,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

BoqActivitySchema.index({ boqId: 1, event: 1 });
BoqActivitySchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model("BoqActivity", BoqActivitySchema);
