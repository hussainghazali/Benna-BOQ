// validation/creditSchemas.js
const Joi = require("joi");

const creditPurchaseSchema = Joi.object({
  customerId: Joi.string().required().trim(),
  packageId: Joi.string()
    .valid(
      "free_50",
      "boq_100",
      "boq_250",
      "boq_500",
      "boq_1000",
    )
    .required(),
  idempotencyKey: Joi.string().min(10).max(100).required(),
});

const creditDeductSchema = Joi.object({}); // No body needed, customerId from params

const creditTransactionQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// Param schema for /users/website/:customerId/credits and related routes
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const customerIdParamSchema = Joi.object({
  customerId: Joi.string().pattern(objectIdPattern).required(),
});

module.exports = {
  creditPurchaseSchema,
  creditDeductSchema,
  creditTransactionQuerySchema,
  customerIdParamSchema,
};
