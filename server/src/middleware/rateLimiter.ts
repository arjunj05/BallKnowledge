/**
 * In-memory rate limiter for socket events
 * Prevents DoS attacks by limiting request frequency per socket
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if a socket has exceeded rate limit
   * @param socketId - Unique socket identifier
   * @param maxRequests - Maximum requests allowed per window
   * @param windowMs - Time window in milliseconds
   * @returns true if allowed, false if rate limited
   */
  public checkLimit(
    socketId: string,
    maxRequests: number,
    windowMs: number
  ): boolean {
    const now = Date.now();
    const entry = this.limits.get(socketId);

    if (!entry || now > entry.resetAt) {
      // No entry or expired - create new entry
      this.limits.set(socketId, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Remove expired entries to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [socketId, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(socketId);
      }
    }
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  public clear(): void {
    this.limits.clear();
  }

  /**
   * Stop the cleanup interval
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Rate limit presets for different action types
export const RATE_LIMITS = {
  GAME_ACTION: { maxRequests: 10, windowMs: 1000 }, // 10 per second
  PROFILE_ACTION: { maxRequests: 5, windowMs: 1000 }, // 5 per second
  ROOM_ACTION: { maxRequests: 3, windowMs: 1000 }, // 3 per second
} as const;

// Global rate limiter instance
export const rateLimiter = new RateLimiter();
