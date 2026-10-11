// models/boqFeedback.model.js
const mongoose = require("mongoose");

const BoqFeedbackSchema = new mongoose.Schema(
  {
    // Context
    customerId: {
      type: String,
      required: [true, "customerId is required"],
      index: true,
    },
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

    // Item-specific feedback
    boqItemId: {
      type: String,
      required: [true, "boqItemId is required"],
      index: true,
    },
    category: {
      type: String,
      required: [true, "category is required"],
      trim: true,
      index: true,
    },
    item: {
      type: String,
      required: [true, "item is required"],
      trim: true,
      maxlength: [500, "Item name too long"],
    },
    originalQuantity: {
      type: Number,
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    originalUnitPrice: {
      type: Number,
      min: [0, "Price cannot be negative"],
      default: 0,
    },

    // Feedback type
    feedbackType: {
      type: String,
      enum: {
        values: ["helpful", "inaccurate", "missing", "replaced", "removed"],
        message: "Invalid feedback type: {VALUE}",
      },
      required: [true, "feedbackType is required"],
      index: true,
    },

    // User modifications
    modifiedQuantity: {
      type: Number,
      min: [0, "Modified quantity cannot be negative"],
    },
    modifiedUnitPrice: {
      type: Number,
      min: [0, "Modified price cannot be negative"],
    },
    replacementItem: {
      type: String,
      trim: true,
      maxlength: [500, "Replacement item name too long"],
    },
    replacementProductId: { type: String, index: true },
    replacementReason: {
      type: String,
      trim: true,
      maxlength: [2000, "Reason too long"],
    },

    // Scoring
    accuracyScore: {
      type: Number,
      min: [1, "Minimum score is 1"],
      max: [5, "Maximum score is 5"],
      default: 0,
    },
    relevanceScore: {
      type: Number,
      min: [1, "Minimum score is 1"],
      max: [5, "Maximum score is 5"],
      default: 0,
    },

    // Learning signals
    suggestedImprovement: {
      type: String,
      trim: true,
      maxlength: [5000, "Suggestion too long"],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [100, "Tag too long"],
      },
    ],

    // Metadata
    userAgent: {
      type: String,
      trim: true,
      maxlength: [1000, "User agent too long"],
    },
    ipAddress: { type: String }, // Added for security
  },
  {
    timestamps: true, // createdAt, updatedAt handled automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for learning analytics
BoqFeedbackSchema.index({ feedbackType: 1, createdAt: -1 });
BoqFeedbackSchema.index({ projectType: 1, category: 1, createdAt: -1 });
BoqFeedbackSchema.index({ city: 1, category: 1, createdAt: -1 });
BoqFeedbackSchema.index({ customerId: 1, createdAt: -1 });
// Prevent duplicate feedback on same item by same user within 24h
BoqFeedbackSchema.index({ customerId: 1, boqItemId: 1, createdAt: -1 });

module.exports = mongoose.model("BoqFeedback", BoqFeedbackSchema);
