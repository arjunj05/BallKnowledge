/**
 * AdminService - Business logic for admin operations
 * Handles question CRUD operations and system management
 */

import prisma from "../db/prisma";

export interface QuestionInput {
  id: string;
  category: string;
  clue: string;
  acceptedAnswers: string[];
  displayAnswer: string;
}

export interface QuestionUpdateInput {
  category?: string;
  clue?: string;
  acceptedAnswers?: string[];
  displayAnswer?: string;
}

export class AdminService {
  /**
   * Create a new question
   */
  static async createQuestion(data: QuestionInput, createdBy: string) {
    // Check if question ID already exists
    const existing = await prisma.question.findUnique({
      where: { id: data.id },
    });

    if (existing) {
      throw new Error(`Question with ID "${data.id}" already exists`);
    }

    const question = await prisma.question.create({
      data: {
        id: data.id,
        category: data.category,
        clue: data.clue,
        acceptedAnswers: data.acceptedAnswers,
        displayAnswer: data.displayAnswer,
        createdBy,
      },
    });

    return question;
  }

  /**
   * Get a single question by ID
   */
  static async getQuestion(id: string) {
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new Error(`Question with ID "${id}" not found`);
    }

    return question;
  }

  /**
   * List all questions with pagination
   */
  static async listQuestions(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.question.count(),
    ]);

    return {
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update an existing question
   */
  static async updateQuestion(id: string, data: QuestionUpdateInput) {
    // Verify question exists
    await this.getQuestion(id);

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(data.category && { category: data.category }),
        ...(data.clue && { clue: data.clue }),
        ...(data.acceptedAnswers && { acceptedAnswers: data.acceptedAnswers }),
        ...(data.displayAnswer && { displayAnswer: data.displayAnswer }),
      },
    });

    return question;
  }

  /**
   * Delete a question
   */
  static async deleteQuestion(id: string) {
    // Verify question exists
    await this.getQuestion(id);

    await prisma.question.delete({
      where: { id },
    });

    return { success: true, message: `Question "${id}" deleted successfully` };
  }

  /**
   * Get system statistics (for future analytics)
   */
  static async getSystemStats() {
    const [totalQuestions, totalUsers, totalGames] = await Promise.all([
      prisma.question.count(),
      prisma.user.count(),
      prisma.game.count(),
    ]);

    return {
      totalQuestions,
      totalUsers,
      totalGames,
    };
  }
}
