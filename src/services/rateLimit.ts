import { database } from "../config/database.js";
import { logger } from "../utils/logger.js";

interface RateLimit {
  user_id: number;
  request_count: number;
  window_start: string;
}

export class RateLimitService {
  private readonly maxRequestsPerMinute = 10;
  private readonly windowSizeMs = 60 * 1000; // 1 minute

  async checkRateLimit(userId: number): Promise<{
    allowed: boolean;
    remainingRequests: number;
    resetTime?: Date;
  }> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - this.windowSizeMs);

      // Get current rate limit record
      const rateLimit = (await database.get(
        "SELECT * FROM rate_limits WHERE user_id = ?",
        [userId]
      )) as RateLimit | undefined;

      if (!rateLimit) {
        // First request for this user
        await database.run(
          "INSERT INTO rate_limits (user_id, request_count, window_start) VALUES (?, 1, ?)",
          [userId, now.toISOString()]
        );

        return {
          allowed: true,
          remainingRequests: this.maxRequestsPerMinute - 1,
        };
      }

      const lastWindowStart = new Date(rateLimit.window_start);

      // Check if we need to reset the window
      if (lastWindowStart < windowStart) {
        // Reset the window
        await database.run(
          "UPDATE rate_limits SET request_count = 1, window_start = ? WHERE user_id = ?",
          [now.toISOString(), userId]
        );

        return {
          allowed: true,
          remainingRequests: this.maxRequestsPerMinute - 1,
        };
      }

      // Check if user has exceeded the limit
      if (rateLimit.request_count >= this.maxRequestsPerMinute) {
        const resetTime = new Date(
          lastWindowStart.getTime() + this.windowSizeMs
        );

        logger.warning("Rate limit exceeded", {
          user_id: userId,
          request_count: rateLimit.request_count,
          max_requests: this.maxRequestsPerMinute,
        });

        return {
          allowed: false,
          remainingRequests: 0,
          resetTime,
        };
      }

      // Increment request count
      await database.run(
        "UPDATE rate_limits SET request_count = request_count + 1 WHERE user_id = ?",
        [userId]
      );

      return {
        allowed: true,
        remainingRequests:
          this.maxRequestsPerMinute - rateLimit.request_count - 1,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Rate limit check error", {
        user_id: userId,
        error: errorMessage,
      });

      // On error, allow the request but log it
      return {
        allowed: true,
        remainingRequests: this.maxRequestsPerMinute,
      };
    }
  }

  async resetUserRateLimit(userId: number): Promise<void> {
    try {
      await database.run("DELETE FROM rate_limits WHERE user_id = ?", [userId]);
      logger.info("Rate limit reset for user", { user_id: userId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Rate limit reset error", {
        user_id: userId,
        error: errorMessage,
      });
    }
  }

  async getRateLimitStatus(userId: number): Promise<{
    requestCount: number;
    maxRequests: number;
    windowStart: Date | null;
  }> {
    try {
      const rateLimit = (await database.get(
        "SELECT * FROM rate_limits WHERE user_id = ?",
        [userId]
      )) as RateLimit | undefined;

      if (!rateLimit) {
        return {
          requestCount: 0,
          maxRequests: this.maxRequestsPerMinute,
          windowStart: null,
        };
      }

      return {
        requestCount: rateLimit.request_count,
        maxRequests: this.maxRequestsPerMinute,
        windowStart: new Date(rateLimit.window_start),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Get rate limit status error", {
        user_id: userId,
        error: errorMessage,
      });

      return {
        requestCount: 0,
        maxRequests: this.maxRequestsPerMinute,
        windowStart: null,
      };
    }
  }
}

export const rateLimitService = new RateLimitService();
