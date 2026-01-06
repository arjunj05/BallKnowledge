import { z } from "zod";

/**
 * Validation schemas for socket event payloads
 * These prevent malicious clients from sending invalid or malformed data
 */

// Room management
export const JoinRoomSchema = z.object({
  roomId: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/),
});

// Betting phase actions
export const BetSchema = z.object({
  amount: z.number().int().positive().max(1000),
});

export const RaiseSchema = z.object({
  amount: z.number().int().positive().max(1000),
});

// No payload schemas (these actions don't take data, but we validate they're objects)
export const MatchSchema = z.object({}).optional();
export const FoldSchema = z.object({}).optional();
export const BuzzSchema = z.object({}).optional();

// Answer phase
export const AnswerSchema = z.object({
  text: z.string().trim().min(1).max(200),
});

export const AnswerTypingSchema = z.object({
  text: z.string().max(200),
});

// Profile actions
export const UpdateAliasSchema = z.object({
  alias: z.string().trim().min(1).max(50),
});

/**
 * Helper function to validate data against a schema
 * Returns parsed data if valid, null if invalid
 */
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return { success: false, error: errorMessage };
    }
    return { success: false, error: "Invalid payload" };
  }
}
