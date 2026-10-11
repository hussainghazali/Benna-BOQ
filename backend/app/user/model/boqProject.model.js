// models/boqProject.model.js
const mongoose = require("mongoose");

const boqProjectSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: [true, "customerId is required"],
      index: true,
    },
    projectName: {
      type: String,
      required: [true, "projectName is required"],
      trim: true,
      maxlength: [200, "Project name cannot exceed 200 characters"],
    },
    projectType: {
      type: String,
      required: [true, "projectType is required"],
      trim: true,
      enum: {
        values: [
          "villa",
          "apartment",
          "commercial",
          "warehouse",
          "renovation",
          "landscape",
          "other",
        ],
        message: "Invalid project type",
      },
    },
    city: {
      type: String,
      required: [true, "city is required"],
      trim: true,
    },
    areaSqm: {
      type: Number,
      required: [true, "areaSqm is required"],
      min: [1, "Area must be at least 1 sqm"],
      max: [1000000, "Area cannot exceed 1,000,000 sqm"],
    },
    floors: {
      type: Number,
      required: [true, "floors is required"],
      min: [1, "Must have at least 1 floor"],
      max: [200, "Cannot exceed 200 floors"],
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    boqResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    estimatedCost: {
      type: Number,
      min: [0, "Cost cannot be negative"],
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "completed", "archived"],
      default: "draft",
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    vendorInterests: [
      {
        vendorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "auth",
          required: true,
        },
        notes: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    interestCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index for common queries
boqProjectSchema.index({ customerId: 1, status: 1, createdAt: -1 });
boqProjectSchema.index({ customerId: 1, projectType: 1 });
boqProjectSchema.index({ city: 1, status: 1, createdAt: -1 });
boqProjectSchema.index({ projectType: 1, status: 1 });
boqProjectSchema.index({ estimatedCost: 1 });
boqProjectSchema.index({ "vendorInterests.vendorId": 1 });

module.exports = mongoose.model("BOQProject", boqProjectSchema);
