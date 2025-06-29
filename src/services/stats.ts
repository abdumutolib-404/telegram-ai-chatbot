import { database } from "../config/database.js";
import { userService } from "./user.js";

export const statsService = {
  async getUserStats(telegramId: number) {
    const user = await userService.getUser(telegramId);
    if (!user) throw new Error("Foydalanuvchi topilmadi");

    // Bugungi statistika
    const today = new Date().toDateString();
    const dailyStats = await database.get(
      `
      SELECT * FROM user_stats 
      WHERE user_id = ? AND date(created_at) = date('now')
    `,
      [user.id]
    );

    return {
      daily_requests: dailyStats?.requests || 0,
      daily_tokens: dailyStats?.tokens || 0,
      total_requests:
        user.total_used > 0 ? Math.floor(user.total_used / 100) : 0,
      total_tokens: user.total_used,
      created_at: user.created_at,
    };
  },

  async updateStats(telegramId: number, tokens: number): Promise<void> {
    const user = await userService.getUser(telegramId);
    if (!user) return;

    // Token ishlatilishini yangilash
    await userService.updateTokenUsage(telegramId, tokens);

    // Statistika yangilash
    const existingStats = await database.get(
      `
      SELECT * FROM user_stats 
      WHERE user_id = ? AND date(created_at) = date('now')
    `,
      [user.id]
    );

    if (existingStats) {
      await database.run(
        `
        UPDATE user_stats SET 
          requests = requests + 1, 
          tokens = tokens + ? 
        WHERE id = ?
      `,
        [tokens, existingStats.id]
      );
    } else {
      await database.run(
        `
        INSERT INTO user_stats (user_id, requests, tokens)
        VALUES (?, 1, ?)
      `,
        [user.id, tokens]
      );
    }
  },
};
