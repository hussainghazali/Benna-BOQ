// models/boqCatalogGap.js
const mongoose = require("mongoose");

const BoqCatalogGapSchema = new mongoose.Schema(
  {
    // Who & where
    customerId: { type: String, index: true, default: null },
    projectId: { type: String, index: true },
    projectName: {
      type: String,
      trim: true,
      maxlength: [200, "Project name too long"],
    },
    projectType: {
      type: String,
      trim: true,
      index: true,
      enum: [
        "villa",
        "apartment",
        "commercial",
        "warehouse",
        "renovation",
        "landscape",
        "other",
        "",
      ],
    },
    city: { type: String, trim: true, index: true },
    areaSqm: {
      type: Number,
      min: [0, "Area cannot be negative"],
      max: [1000000, "Area too large"],
    },
    floors: {
      type: Number,
      min: [1, "Must have at least 1 floor"],
      max: [200, "Too many floors"],
    },

    // The unmatched BOQ line
    boqCategory: {
      type: String,
      required: [true, "boqCategory is required"],
      index: true,
      trim: true,
    },
    boqItem: {
      type: String,
      required: [true, "boqItem is required"],
      trim: true,
      maxlength: [500, "Item name too long"],
    },
    boqItemNormalized: {
      type: String,
      required: [true, "boqItemNormalized is required"],
      index: true,
      trim: true,
      lowercase: true,
    },
    boqBrand: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
    unit: {
      type: String,
      default: "",
      trim: true,
      maxlength: [50, "Unit too long"],
    },
    estimatedUnitPrice: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    estimatedTotalPrice: {
      type: Number,
      default: 0,
      min: [0, "Total price cannot be negative"],
    },

    // Matching diagnostics
    bestMatchScore: {
      type: Number,
      default: 0,
      min: [0, "Score cannot be negative"],
      max: [1, "Score cannot exceed 1"],
    },
    matchType: {
      type: String,
      enum: ["unmatched", "weak_match"],
      default: "unmatched",
      index: true,
    },

    // Aggregation helpers
    requestCount: {
      type: Number,
      default: 1,
      min: [1, "Request count cannot be less than 1"],
    },
    lastRequestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Admin workflow
    status: {
      type: String,
      enum: ["pending", "in_review", "sourcing", "added", "ignored"],
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: [5000, "Admin notes too long"],
    },
    assignedTo: { type: String, index: true }, // Added for team assignment
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

// Compound index for the aggregation dashboard
BoqCatalogGapSchema.index(
  { boqItemNormalized: 1, boqCategory: 1, customerId: 1 },
  { unique: true },
);
BoqCatalogGapSchema.index({ status: 1, lastRequestedAt: -1 });
BoqCatalogGapSchema.index({ requestCount: -1, lastRequestedAt: -1 });
// Text search index
BoqCatalogGapSchema.index({
  boqItem: "text",
  boqCategory: "text",
  boqBrand: "text",
});

module.exports = mongoose.model("BoqCatalogGap", BoqCatalogGapSchema);
