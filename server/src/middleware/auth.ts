import { createClerkClient, verifyToken } from "@clerk/clerk-sdk-node";
import type { Socket } from "socket.io";
import { UserService } from "../services/UserService.js";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  dbUserId?: string;
}

export async function authenticateSocket(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // Verify the JWT token (networkless verification)
    // The issuer should be your Clerk Frontend API URL (e.g., https://your-domain.clerk.accounts.dev)
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      issuer: (iss) => iss.startsWith("https://") && iss.includes(".clerk.accounts.dev"),
    });

    if (!payload || !payload.sub) {
      return next(new Error("Invalid authentication token"));
    }

    const userId = payload.sub;

    // Get user details from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const username = clerkUser.username || clerkUser.firstName || undefined;
    const alias = clerkUser.unsafeMetadata?.alias as string | undefined;

    if (!email) {
      return next(new Error("User email not found"));
    }

    // Find or create user in our database
    const dbUser = await UserService.findOrCreateUser(
      clerkUser.id,
      email,
      username,
      alias
    );

    if (!dbUser) {
      return next(new Error("Failed to create/retrieve user"));
    }

    // Attach user info to socket
    socket.userId = clerkUser.id;
    socket.userEmail = email;
    socket.dbUserId = dbUser.id;

    console.log(`[Auth] User authenticated: ${email} (Clerk: ${clerkUser.id}, DB: ${dbUser.id})`);

    next();
  } catch (error) {
    console.error("[Auth] Authentication error:", error);
    next(new Error("Authentication failed"));
  }
}
