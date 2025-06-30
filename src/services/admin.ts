import { database } from "../config/database.js";
import { userService } from "./user.js";
import { logger } from "../utils/logger.js";

export const adminService = {
  async getSystemStats() {
    try {
      // Jami foydalanuvchilar (botlarni hisobga olmaslik)
      const totalUsersResult = database.get(
        "SELECT COUNT(*) as count FROM users WHERE telegram_id != 1087968824"
      );
      const totalUsers = totalUsersResult?.count || 0;

      // Bugungi faol foydalanuvchilar
      const dailyActiveResult = database.get(`
        SELECT COUNT(*) as count FROM users 
        WHERE date(updated_at) = date('now') AND telegram_id != 1087968824
      `);
      const dailyActive = dailyActiveResult?.count || 0;

      // Bugungi statistika
      const dailyStatsResult = database.all(`
        SELECT requests, tokens FROM user_stats 
        WHERE date(created_at) = date('now')
      `);

      const dailyRequests = dailyStatsResult.reduce(
        (sum, stat) => sum + stat.requests,
        0
      );
      const dailyTokens = dailyStatsResult.reduce(
        (sum, stat) => sum + stat.tokens,
        0
      );

      // Jami statistika
      const allUsersResult = database.all(
        "SELECT total_used FROM users WHERE telegram_id != 1087968824"
      );
      const totalRequests = allUsersResult.reduce(
        (sum, user) => sum + Math.floor(user.total_used / 100),
        0
      );
      const totalTokens = allUsersResult.reduce(
        (sum, user) => sum + user.total_used,
        0
      );

      return {
        total_users: totalUsers,
        daily_active: dailyActive,
        daily_requests: dailyRequests,
        daily_tokens: dailyTokens,
        total_requests: totalRequests,
        total_tokens: totalTokens,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting system stats", { error: errorMessage });
      return {
        total_users: 0,
        daily_active: 0,
        daily_requests: 0,
        daily_tokens: 0,
        total_requests: 0,
        total_tokens: 0,
      };
    }
  },

  async addTokens(
    telegramId: number,
    dailyTokens: number,
    totalTokens: number
  ): Promise<void> {
    try {
      await userService.addTokens(telegramId, dailyTokens, totalTokens);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Admin add tokens error", {
        error: errorMessage,
        user_id: telegramId,
      });
      throw error;
    }
  },

  async removeTokens(
    telegramId: number,
    dailyTokens: number,
    totalTokens: number
  ): Promise<{
    success: boolean;
    message: string;
    currentTokens?: { daily: number; total: number };
  }> {
    try {
      return await userService.removeTokens(
        telegramId,
        dailyTokens,
        totalTokens
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Admin remove tokens error", {
        error: errorMessage,
        user_id: telegramId,
      });
      return {
        success: false,
        message: "Tokenlarni ayirishda xatolik yuz berdi",
      };
    }
  },

  async getTotalUsers(): Promise<number> {
    try {
      const result = database.get(
        "SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND telegram_id != 1087968824"
      );
      return result?.count || 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting total users", { error: errorMessage });
      return 0;
    }
  },

  async getActiveUsers(): Promise<number> {
    try {
      const result = database.get(`
        SELECT COUNT(*) as count FROM users 
        WHERE is_active = 1 AND date(updated_at) >= date('now', '-7 days') AND telegram_id != 1087968824
      `);
      return result?.count || 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting active users", { error: errorMessage });
      return 0;
    }
  },
};
