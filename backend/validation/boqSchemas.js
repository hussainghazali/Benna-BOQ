// validation/boqSchemas.js
const Joi = require("joi");

// ==================== BOQ Project Schemas ====================

const createBOQProjectSchema = Joi.object({
  projectName: Joi.string().trim().min(2).max(200).required().messages({
    "string.base": "projectName must be a string",
    "string.empty": "projectName is required",
    "string.min": "projectName must be at least 2 characters",
    "string.max": "projectName cannot exceed 200 characters",
    "any.required": "projectName is required",
  }),
  projectType: Joi.string()
    .trim()
    .valid(
      "villa",
      "apartment",
      "commercial",
      "warehouse",
      "renovation",
      "landscape",
      "other",
    )
    .required()
    .messages({
      "string.base": "projectType must be a string",
      "any.only":
        "projectType must be one of: villa, apartment, commercial, warehouse, renovation, landscape, other",
      "any.required": "projectType is required",
    }),
  city: Joi.string().trim().max(100).required().messages({
    "string.base": "city must be a string",
    "string.empty": "city is required",
    "string.max": "city cannot exceed 100 characters",
    "any.required": "city is required",
  }),
  areaSqm: Joi.number().integer().min(1).max(1000000).required().messages({
    "number.base": "areaSqm must be a number",
    "number.min": "areaSqm must be at least 1 sqm",
    "number.max": "areaSqm cannot exceed 1,000,000 sqm",
    "any.required": "areaSqm is required",
  }),
  floors: Joi.number().integer().min(1).max(200).required().messages({
    "number.base": "floors must be a number",
    "number.min": "floors must be at least 1",
    "number.max": "floors cannot exceed 200",
    "any.required": "floors is required",
  }),
  specifications: Joi.object().optional(),
  boqResult: Joi.object().optional().allow(null),
  estimatedCost: Joi.number().min(0).optional().messages({
    "number.base": "estimatedCost must be a number",
    "number.min": "estimatedCost cannot be negative",
  }),
});

const updateBOQProjectSchema = Joi.object({
  projectName: Joi.string().trim().min(2).max(200).optional(),
  projectType: Joi.string()
    .trim()
    .valid(
      "villa",
      "apartment",
      "commercial",
      "warehouse",
      "renovation",
      "landscape",
      "other",
    )
    .optional(),
  city: Joi.string().trim().max(100).optional(),
  areaSqm: Joi.number().integer().min(1).max(1000000).optional(),
  floors: Joi.number().integer().min(1).max(200).optional(),
  specifications: Joi.object().optional(),
  boqResult: Joi.object().optional().allow(null),
  estimatedCost: Joi.number().min(0).optional(),
  status: Joi.string().valid("draft", "completed", "archived").optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// ==================== BOQ Feedback Schema ====================

const boqFeedbackSchema = Joi.object({
  projectId: Joi.string().trim().optional().allow(""),
  projectName: Joi.string().trim().max(200).optional().allow(""),
  projectType: Joi.string().trim().optional().allow(""),
  city: Joi.string().trim().optional().allow(""),
  areaSqm: Joi.number().min(0).max(1000000).optional(),
  floors: Joi.number().integer().min(1).max(200).optional(),
  boqItemId: Joi.string().trim().required().messages({
    "string.base": "boqItemId must be a string",
    "any.required": "boqItemId is required",
  }),
  category: Joi.string().trim().required().messages({
    "string.base": "category must be a string",
    "any.required": "category is required",
  }),
  item: Joi.string().trim().max(500).required().messages({
    "string.base": "item must be a string",
    "string.max": "item cannot exceed 500 characters",
    "any.required": "item is required",
  }),
  originalQuantity: Joi.number().min(0).default(0),
  originalUnitPrice: Joi.number().min(0).default(0),
  feedbackType: Joi.string()
    .valid("helpful", "inaccurate", "missing", "replaced", "removed")
    .required()
    .messages({
      "string.base": "feedbackType must be a string",
      "any.only":
        "feedbackType must be one of: helpful, inaccurate, missing, replaced, removed",
      "any.required": "feedbackType is required",
    }),
  modifiedQuantity: Joi.number().min(0).optional(),
  modifiedUnitPrice: Joi.number().min(0).optional(),
  replacementItem: Joi.string().trim().max(500).optional().allow(""),
  replacementProductId: Joi.string().trim().optional().allow(""),
  replacementReason: Joi.string().trim().max(2000).optional().allow(""),
  accuracyScore: Joi.number().integer().min(1).max(5).optional().messages({
    "number.min": "accuracyScore must be between 1 and 5",
    "number.max": "accuracyScore must be between 1 and 5",
  }),
  relevanceScore: Joi.number().integer().min(1).max(5).optional().messages({
    "number.min": "relevanceScore must be between 1 and 5",
    "number.max": "relevanceScore must be between 1 and 5",
  }),
  suggestedImprovement: Joi.string().trim().max(5000).optional().allow(""),
  tags: Joi.array().items(Joi.string().trim().max(100)).optional(),
});

// ==================== BOQ Product Match Schema ====================

const boqProductMatchSchema = Joi.object({
  item: Joi.string().trim().min(1).max(500).required().messages({
    "string.base": "item must be a string",
    "string.empty": "item is required",
    "string.max": "item cannot exceed 500 characters",
    "any.required": "item is required",
  }),
  category: Joi.string().trim().max(100).optional().allow(""),
  brand: Joi.string().trim().max(100).optional().allow(""),
  city: Joi.string().trim().max(100).optional().allow(""),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
});

// ==================== BOQ Gaps Log Schema ====================

const boqGapsLogSchema = Joi.object({
  projectId: Joi.string().trim().optional().allow(null, ""),
  projectName: Joi.string().trim().max(200).optional().allow(""),
  projectType: Joi.string().trim().optional().allow(""),
  city: Joi.string().trim().optional().allow(""),
  areaSqm: Joi.number().min(0).max(1000000).optional().default(0),
  floors: Joi.number().integer().min(1).max(200).optional().default(1),
  gaps: Joi.array()
    .items(
      Joi.object({
        category: Joi.string().trim().required(),
        item: Joi.string().trim().required(),
        brand: Joi.string().trim().allow("").optional(),
        quantity: Joi.number().min(0).optional(),
        unit: Joi.string().trim().allow("").optional(),
        unitPrice: Joi.number().min(0).optional(),
        totalPrice: Joi.number().min(0).optional(),
        score: Joi.number().min(0).max(1).optional().default(0),
      }),
    )
    .max(500)
    .required()
    .messages({
      "array.max": "Cannot log more than 500 gaps at once",
      "any.required": "gaps array is required",
    }),
});

// ==================== BOQ Activity Schema ====================
// Analytics-only event log (generation, cart adds, feedback, CSV export,
// product swaps). Deliberately lenient — this must never block or error out
// the client for shape reasons; unknown keys are stripped by validate().
const boqActivitySchema = Joi.object({
  customerId: Joi.string().trim().allow(null, "").optional(),
  boqId: Joi.string().trim().required().messages({
    "any.required": "boqId is required",
  }),
  event: Joi.string()
    .valid(
      "generated",
      "add_to_cart_row",
      "add_all_to_cart",
      "feedback",
      "csv_export",
      "swap_product",
    )
    .required()
    .messages({
      "any.only":
        "event must be one of: generated, add_to_cart_row, add_all_to_cart, feedback, csv_export, swap_product",
      "any.required": "event is required",
    }),
  projectInputs: Joi.object().optional().allow(null),
  totalEstimate: Joi.number().optional(),
  itemsCount: Joi.number().integer().optional(),
  matchedCount: Joi.number().integer().optional(),
  addedToCartItems: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().trim().optional(),
        quantity: Joi.number().optional(),
      }),
    )
    .optional(),
  feedback: Joi.object({
    accuracyRating: Joi.number().optional(),
    pricingRating: Joi.number().optional(),
    improvements: Joi.array().items(Joi.string().trim()).optional(),
    comment: Joi.string().trim().max(5000).allow("").optional(),
  }).optional(),
  metadata: Joi.object().optional().allow(null),
});

module.exports = {
  createBOQProjectSchema,
  updateBOQProjectSchema,
  boqFeedbackSchema,
  boqProductMatchSchema,
  boqGapsLogSchema,
  boqActivitySchema,
};
