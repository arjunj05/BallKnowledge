import { z } from "zod";

/**
 * Validation schemas for admin API endpoints
 * Ensures admin operations receive properly formatted data
 */

/**
 * Schema for creating a new question
 */
export const CreateQuestionSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, {
    message: "Question ID must be lowercase letters, numbers, and underscores only"
  }),
  category: z.string().min(1).max(50),
  clue: z.string().min(10).max(1000),
  acceptedAnswers: z.array(z.string().min(1).max(200)).min(1).max(20),
  displayAnswer: z.string().min(1).max(200),
});

/**
 * Schema for updating an existing question
 * All fields are optional to allow partial updates
 */
export const UpdateQuestionSchema = z.object({
  category: z.string().min(1).max(50).optional(),
  clue: z.string().min(10).max(1000).optional(),
  acceptedAnswers: z.array(z.string().min(1).max(200)).min(1).max(20).optional(),
  displayAnswer: z.string().min(1).max(200).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

/**
 * Schema for pagination query parameters
 * Query params come as strings, so we handle both string and missing cases
 */
export const PaginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1).pipe(z.number().int().positive()),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20).pipe(z.number().int().positive().max(100)),
});

/**
 * Helper function to validate admin request data
 */
export function validateAdminPayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return { success: false, error: errorMessage };
    }
    return { success: false, error: "Invalid payload" };
  }
}
