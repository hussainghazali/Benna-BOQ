// app/user/controller/boqProject.controller.js
const BOQProject = require("../model/boqProject.model");
const mongoose = require("mongoose");
const AUTH_MODEL = require("../../auth/model/auth.model");
const nodemailerHelper = require("../../../helpers/nodemailer");
const resendMailer = require("../../../helpers/resendMailer");
const { sendMailAlertToAdmins } = require("../../../helpers/emailNotification");
// const logger = require("../../../helpers/logger");

const fireAndForget = (promise, label) => {
  Promise.resolve(promise).catch((err) =>
    console.error(`${label || "async"} failed:`, err?.message || err),
  );
};

// Helper: sanitize string inputs
const sanitizeString = (str) => {
  if (!str || typeof str !== "string") return undefined;
  return str.trim().slice(0, 500); // Prevent massive strings
};

// Helper: validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createBOQProject = async (req, res) => {
  try {
    console.log("Create BOQ project attempt", {
      endpoint: "/users/website/boq-projects",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      projectName: req.body.projectName,
      projectType: req.body.projectType,
    });

    // Use req.user?.id consistently (matches standard auth middleware)
    const userId = req.user?.id || req.userId;

    if (!userId) {
      console.warn("Create BOQ project failed: Authentication required", {
        endpoint: "/users/website/boq-projects",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      projectName,
      projectType,
      city,
      areaSqm,
      floors,
      specifications,
      boqResult,
      estimatedCost,
    } = req.body;

    // Validation
    const errors = [];
    if (!projectName || projectName.trim().length < 2) {
      errors.push("projectName must be at least 2 characters");
    }
    if (!projectType) errors.push("projectType is required");
    if (!city) errors.push("city is required");
    if (!areaSqm || Number(areaSqm) < 1 || Number(areaSqm) > 1000000) {
      errors.push("areaSqm must be between 1 and 1,000,000");
    }
    if (!floors || Number(floors) < 1 || Number(floors) > 200) {
      errors.push("floors must be between 1 and 200");
    }

    if (errors.length > 0) {
      console.warn("Create BOQ project failed: Validation errors", {
        endpoint: "/users/website/boq-projects",
        ip: req._remoteAddress,
        userId,
        errors,
      });
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const boqProject = await BOQProject.create({
      customerId: String(userId),
      projectName: sanitizeString(projectName),
      projectType: sanitizeString(projectType),
      city: sanitizeString(city),
      areaSqm: Number(areaSqm),
      floors: Number(floors),
      specifications: specifications || {},
      boqResult: boqResult || null,
      estimatedCost: estimatedCost ? Number(estimatedCost) : 0,
      status: "draft",
    });

    console.log("Create BOQ project successful", {
      endpoint: "/users/website/boq-projects",
      ip: req._remoteAddress,
      userId,
      projectId: boqProject._id,
    });

    fireAndForget(
      AUTH_MODEL.findById(userId)
        .select("email fullName firstName")
        .lean()
        .then((user) => {
          const customerName =
            user?.fullName || user?.firstName || "A customer";
          const customerEmail = user?.email || "—";
          const projectId = boqProject._id.toString().slice(-6).toUpperCase();
          return sendMailAlertToAdmins({
            subject: `🏗️ New BOQ Project Created — #${projectId} by ${customerName}`,
            replacements: {
              TITLE: `New BOQ Project: #${projectId}`,
              BODY: `Customer: ${customerName} (${customerEmail})\nProject: ${boqProject.projectName}\nType: ${boqProject.projectType} | City: ${boqProject.city}\nArea: ${boqProject.areaSqm} m² | Floors: ${boqProject.floors}${boqProject.estimatedCost ? "\nEstimated Cost: " + boqProject.estimatedCost.toLocaleString() + " SAR" : ""}`,
            },
          });
        }),
      "BOQ admin notification",
    );

    return res.status(201).json({
      success: true,
      message: "BOQ project created successfully",
      data: boqProject,
    });
  } catch (error) {
    console.error("Create BOQ project error", {
      endpoint: "/users/website/boq-projects",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      error: error.message,
      stack: error.stack,
    });
    console.error("createBOQProject error:", error);

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create BOQ project",
    });
  }
};

const getUserBOQProjects = async (req, res) => {
  try {
    console.log("Get user BOQ projects attempt", {
      endpoint: "/users/website/boq-projects",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
    });

    const userId = req.user?.id || req.userId;
    if (!userId) {
      console.warn("Get user BOQ projects failed: Authentication required", {
        endpoint: "/users/website/boq-projects",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20)); // Cap at 100
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = { customerId: String(userId) };
    if (status && ["draft", "completed", "archived"].includes(status)) {
      filter.status = status;
    }

    const [projects, total] = await Promise.all([
      BOQProject.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BOQProject.countDocuments(filter),
    ]);

    console.log("Get user BOQ projects successful", {
      endpoint: "/users/website/boq-projects",
      ip: req._remoteAddress,
      userId,
      count: projects.length,
      total,
    });

    return res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get user BOQ projects error", {
      endpoint: "/users/website/boq-projects",
      ip: req._remoteAddress,
      userId: req.user?.id || req.userId,
      error: error.message,
      stack: error.stack,
    });
    console.error("getUserBOQProjects error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get BOQ projects",
    });
  }
};

const getBOQProjectById = async (req, res) => {
  try {
    console.log("Get BOQ project by ID attempt", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId: req.params.projectId,
      userId: req.user?.id || req.userId,
    });

    const { projectId } = req.params;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      console.warn("Get BOQ project by ID failed: Authentication required", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(projectId)) {
      console.warn("Get BOQ project by ID failed: Invalid project ID", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
        projectId,
        userId,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format",
      });
    }

    const project = await BOQProject.findOne({
      _id: projectId,
      customerId: String(userId),
    }).lean();

    if (!project) {
      console.warn("Get BOQ project by ID failed: Project not found", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
        projectId,
        userId,
      });
      return res.status(404).json({
        success: false,
        message: "BOQ project not found",
      });
    }

    console.log("Get BOQ project by ID successful", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId,
      userId,
    });

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get BOQ project by ID error", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId: req.params.projectId,
      userId: req.user?.id || req.userId,
      error: error.message,
      stack: error.stack,
    });
    console.error("getBOQProjectById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get BOQ project",
    });
  }
};

const updateBOQProject = async (req, res) => {
  try {
    console.log("Update BOQ project attempt", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId: req.params.projectId,
      userId: req.user?.id || req.userId,
    });

    const { projectId } = req.params;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      console.warn("Update BOQ project failed: Authentication required", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(projectId)) {
      console.warn("Update BOQ project failed: Invalid project ID", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
        projectId,
        userId,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format",
      });
    }

    const {
      projectName,
      projectType,
      city,
      areaSqm,
      floors,
      specifications,
      boqResult,
      estimatedCost,
      status,
    } = req.body;

    // Build update object only with provided fields (partial update)
    const update = {};
    if (projectName !== undefined)
      update.projectName = sanitizeString(projectName);
    if (projectType !== undefined)
      update.projectType = sanitizeString(projectType);
    if (city !== undefined) update.city = sanitizeString(city);
    if (areaSqm !== undefined) update.areaSqm = Number(areaSqm);
    if (floors !== undefined) update.floors = Number(floors);
    if (specifications !== undefined) update.specifications = specifications;
    if (boqResult !== undefined) update.boqResult = boqResult;
    if (estimatedCost !== undefined)
      update.estimatedCost = Number(estimatedCost);
    if (
      status !== undefined &&
      ["draft", "completed", "archived"].includes(status)
    ) {
      update.status = status;
    }

    // Prevent empty updates
    if (Object.keys(update).length === 0) {
      console.warn("Update BOQ project failed: No valid fields to update", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
        projectId,
        userId,
      });
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const project = await BOQProject.findOneAndUpdate(
      { _id: projectId, customerId: String(userId) },
      { $set: update },
      { new: true, runValidators: true },
    );

    if (!project) {
      console.warn("Update BOQ project failed: Project not found", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
        projectId,
        userId,
      });
      return res.status(404).json({
        success: false,
        message: "BOQ project not found",
      });
    }

    console.log("Update BOQ project successful", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId,
      userId,
    });

    if (update.boqResult !== undefined || update.estimatedCost !== undefined) {
      fireAndForget(
        AUTH_MODEL.findById(project.customerId)
          .select("email fullName firstName")
          .lean()
          .then((user) => {
            if (user?.email) {
              return resendMailer.sendBOQReadyMail(
                project,
                user.email,
                user.fullName || user.firstName || "Customer",
              );
            }
          }),
        "BOQ ready email",
      );
    }

    return res.status(200).json({
      success: true,
      message: "BOQ project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Update BOQ project error", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId: req.params.projectId,
      userId: req.user?.id || req.userId,
      error: error.message,
      stack: error.stack,
    });
    console.error("updateBOQProject error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update BOQ project",
    });
  }
};

// NEW: Delete endpoint (was missing)
const deleteBOQProject = async (req, res) => {
  try {
    console.log("Delete BOQ project attempt", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId: req.params.projectId,
      userId: req.user?.id || req.userId,
    });

    const { projectId } = req.params;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      console.warn("Delete BOQ project failed: Authentication required", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(projectId)) {
      console.warn("Delete BOQ project failed: Invalid project ID", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
        projectId,
        userId,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format",
      });
    }

    const project = await BOQProject.findOneAndDelete({
      _id: projectId,
      customerId: String(userId),
    });

    if (!project) {
      console.warn("Delete BOQ project failed: Project not found", {
        endpoint: "/users/website/boq-projects/:projectId",
        ip: req._remoteAddress,
        projectId,
        userId,
      });
      return res.status(404).json({
        success: false,
        message: "BOQ project not found",
      });
    }

    console.log("Delete BOQ project successful", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "BOQ project deleted successfully",
    });
  } catch (error) {
    console.error("Delete BOQ project error", {
      endpoint: "/users/website/boq-projects/:projectId",
      ip: req._remoteAddress,
      projectId: req.params.projectId,
      userId: req.user?.id || req.userId,
      error: error.message,
      stack: error.stack,
    });
    console.error("deleteBOQProject error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete BOQ project",
    });
  }
};

module.exports = {
  createBOQProject,
  getUserBOQProjects,
  getBOQProjectById,
  updateBOQProject,
  deleteBOQProject,
};
