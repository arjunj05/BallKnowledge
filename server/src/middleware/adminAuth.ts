/**
 * Admin authentication middleware
 * Verifies user has admin role via Clerk metadata
 */

import { Request, Response, NextFunction } from "express";
import { clerkClient } from "@clerk/clerk-sdk-node";

/**
 * Middleware to require admin role
 * Checks Clerk publicMetadata for role === 'admin'
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token with Clerk
    const session = await clerkClient.verifyToken(token);
    if (!session) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Get user details from Clerk
    const user = await clerkClient.users.getUser(session.sub);

    // Check for admin role in publicMetadata
    const isAdmin = user.publicMetadata?.role === "admin";

    if (!isAdmin) {
      res.status(403).json({
        error: "Admin access required",
        message: "You do not have permission to access this resource"
      });
      return;
    }

    // Attach userId to request for use in route handlers
    (req as any).userId = session.sub;
    (req as any).user = user;

    next();
  } catch (error) {
    console.error("[AdminAuth] Error verifying admin:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}
