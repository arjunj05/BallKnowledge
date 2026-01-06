/**
 * Admin API Routes
 * Protected REST endpoints for question management
 * All routes require admin authentication via requireAdmin middleware
 */

import { Router, Request, Response } from "express";
import { AdminService } from "../services/AdminService";
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  PaginationSchema,
  validateAdminPayload,
} from "../validation/adminSchemas";

const router = Router();

/**
 * POST /api/admin/questions
 * Create a new question
 */
router.post("/questions", async (req: Request, res: Response) => {
  try {
    const validation = validateAdminPayload(CreateQuestionSchema, req.body);

    if (!validation.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.error,
      });
      return;
    }

    const userId = (req as any).userId;
    const question = await AdminService.createQuestion(validation.data, userId);

    res.status(201).json({
      success: true,
      question,
    });
  } catch (error: any) {
    console.error("[Admin API] Create question error:", error);

    if (error.message?.includes("already exists")) {
      res.status(409).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to create question" });
  }
});

/**
 * GET /api/admin/questions
 * List all questions (paginated)
 */
router.get("/questions", async (req: Request, res: Response) => {
  try {
    const validation = validateAdminPayload(PaginationSchema, req.query);

    if (!validation.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.error,
      });
      return;
    }

    const { page, limit } = validation.data;
    const result = await AdminService.listQuestions(page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Admin API] List questions error:", error);
    res.status(500).json({ error: "Failed to list questions" });
  }
});

/**
 * GET /api/admin/questions/:id
 * Get a single question by ID
 */
router.get("/questions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const question = await AdminService.getQuestion(id);

    res.status(200).json({
      success: true,
      question,
    });
  } catch (error: any) {
    console.error("[Admin API] Get question error:", error);

    if (error.message?.includes("not found")) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to get question" });
  }
});

/**
 * PUT /api/admin/questions/:id
 * Update an existing question
 */
router.put("/questions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = validateAdminPayload(UpdateQuestionSchema, req.body);

    if (!validation.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.error,
      });
      return;
    }

    const question = await AdminService.updateQuestion(id, validation.data);

    res.status(200).json({
      success: true,
      question,
    });
  } catch (error: any) {
    console.error("[Admin API] Update question error:", error);

    if (error.message?.includes("not found")) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to update question" });
  }
});

/**
 * DELETE /api/admin/questions/:id
 * Delete a question
 */
router.delete("/questions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AdminService.deleteQuestion(id);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("[Admin API] Delete question error:", error);

    if (error.message?.includes("not found")) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to delete question" });
  }
});

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await AdminService.getSystemStats();

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[Admin API] Get stats error:", error);
    res.status(500).json({ error: "Failed to get system stats" });
  }
});

export default router;
