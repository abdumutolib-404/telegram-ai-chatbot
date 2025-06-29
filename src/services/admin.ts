import { database } from "../config/database.js";

export const adminService = {
  async getSystemStats() {
    // Jami foydalanuvchilar (botlarni hisobga olmaslik)
    const totalUsersResult = await database.get(
      "SELECT COUNT(*) as count FROM users WHERE telegram_id != 1087968824"
    );
    const totalUsers = totalUsersResult?.count || 0;

    // Bugungi faol foydalanuvchilar
    const dailyActiveResult = await database.get(`
      SELECT COUNT(*) as count FROM users 
      WHERE date(updated_at) = date('now') AND telegram_id != 1087968824
    `);
    const dailyActive = dailyActiveResult?.count || 0;

    // Bugungi statistika
    const dailyStatsResult = await database.all(`
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
    const allUsersResult = await database.all(
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
  },

  async addTokens(
    telegramId: number,
    dailyTokens: number,
    totalTokens: number
  ): Promise<void> {
    const user = await database.get(
      "SELECT * FROM users WHERE telegram_id = ?",
      [telegramId]
    );

    if (!user) {
      throw new Error("Foydalanuvchi topilmadi");
    }

    await database.run(
      `
      UPDATE users SET 
        daily_tokens = daily_tokens + ?, 
        total_tokens = total_tokens + ? 
      WHERE telegram_id = ?
    `,
      [dailyTokens, totalTokens, telegramId]
    );
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
    const user = await database.get(
      "SELECT * FROM users WHERE telegram_id = ?",
      [telegramId]
    );

    if (!user) {
      return { success: false, message: "Foydalanuvchi topilmadi" };
    }

    // Joriy tokenlarni tekshirish
    const currentDaily = user.daily_tokens;
    const currentTotal = user.total_tokens;

    if (currentDaily < dailyTokens) {
      return {
        success: false,
        message: `Kunlik tokenlar yetarli emas! Joriy: ${currentDaily}, ayirmoqchi: ${dailyTokens}`,
        currentTokens: { daily: currentDaily, total: currentTotal },
      };
    }

    if (currentTotal < totalTokens) {
      return {
        success: false,
        message: `Umumiy tokenlar yetarli emas! Joriy: ${currentTotal}, ayirmoqchi: ${totalTokens}`,
        currentTokens: { daily: currentDaily, total: currentTotal },
      };
    }

    await database.run(
      `
      UPDATE users SET 
        daily_tokens = daily_tokens - ?, 
        total_tokens = total_tokens - ? 
      WHERE telegram_id = ?
    `,
      [dailyTokens, totalTokens, telegramId]
    );

    return { success: true, message: "Tokenlar muvaffaqiyatli ayirildi" };
  },

  async getTotalUsers(): Promise<number> {
    const result = await database.get(
      "SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND telegram_id != 1087968824"
    );
    return result?.count || 0;
  },

  async getActiveUsers(): Promise<number> {
    const result = await database.get(`
      SELECT COUNT(*) as count FROM users 
      WHERE is_active = 1 AND date(updated_at) >= date('now', '-7 days') AND telegram_id != 1087968824
    `);
    return result?.count || 0;
  },
};
