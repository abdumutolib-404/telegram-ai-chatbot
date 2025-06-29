import { database } from "../config/database.js";
import { logger } from "../utils/logger.js";

export interface Promocode {
  id: number;
  code: string;
  daily_tokens: number;
  total_tokens: number;
  max_usage: number;
  current_usage: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export const promocodeService = {
  async createPromocode(
    code: string,
    dailyTokens: number,
    totalTokens: number,
    maxUsage: number,
    createdBy: number
  ): Promise<void> {
    // Promokod mavjudligini tekshirish
    const existing = await database.get(
      "SELECT id FROM promocodes WHERE code = ?",
      [code]
    );
    if (existing) {
      throw new Error("Bu promokod allaqachon mavjud");
    }

    await database.run(
      `
      INSERT INTO promocodes (code, daily_tokens, total_tokens, max_usage, created_by)
      VALUES (?, ?, ?, ?, ?)
    `,
      [code, dailyTokens, totalTokens, maxUsage, createdBy]
    );

    logger.admin(`Promocode created`, {
      code,
      daily_tokens: dailyTokens,
      total_tokens: totalTokens,
      max_usage: maxUsage,
      created_by: createdBy,
    });
  },

  async usePromocode(
    code: string,
    userId: number
  ): Promise<{
    success: boolean;
    message: string;
    tokens?: { daily: number; total: number };
  }> {
    // Promokodni topish
    const promocode = await database.get(
      `
      SELECT * FROM promocodes 
      WHERE code = ? AND is_active = 1
    `,
      [code]
    );

    if (!promocode) {
      return { success: false, message: "Promokod topilmadi yoki faol emas" };
    }

    // Ishlatish limitini tekshirish
    if (promocode.current_usage >= promocode.max_usage) {
      return { success: false, message: "Promokod ishlatish limiti tugagan" };
    }

    // Foydalanuvchi avval ishlatganligini tekshirish
    const userUsage = await database.get(
      `
      SELECT id FROM promocode_usage 
      WHERE promocode_id = ? AND user_id = ?
    `,
      [promocode.id, userId]
    );

    if (userUsage) {
      return {
        success: false,
        message: "Siz bu promokodni allaqachon ishlatgansiz",
      };
    }

    // Foydalanuvchiga tokenlar qo'shish
    await database.run(
      `
      UPDATE users SET 
        daily_tokens = daily_tokens + ?, 
        total_tokens = total_tokens + ? 
      WHERE telegram_id = ?
    `,
      [promocode.daily_tokens, promocode.total_tokens, userId]
    );

    // Promokod ishlatilganligini belgilash
    await database.run(
      `
      INSERT INTO promocode_usage (promocode_id, user_id)
      VALUES (?, (SELECT id FROM users WHERE telegram_id = ?))
    `,
      [promocode.id, userId]
    );

    // Promokod ishlatish sonini oshirish
    await database.run(
      `
      UPDATE promocodes SET current_usage = current_usage + 1 WHERE id = ?
    `,
      [promocode.id]
    );

    logger.success(`Promocode used`, {
      code,
      user_id: userId,
      daily_tokens: promocode.daily_tokens,
      total_tokens: promocode.total_tokens,
    });

    return {
      success: true,
      message: "Promokod muvaffaqiyatli ishlatildi!",
      tokens: { daily: promocode.daily_tokens, total: promocode.total_tokens },
    };
  },

  async getAllPromocodes(): Promise<Promocode[]> {
    return await database.all(
      "SELECT * FROM promocodes ORDER BY created_at DESC"
    );
  },

  async getActivePromocodes(): Promise<Promocode[]> {
    return await database.all(`
      SELECT * FROM promocodes 
      WHERE is_active = 1 AND current_usage < max_usage 
      ORDER BY created_at DESC
    `);
  },

  async togglePromocode(id: number): Promise<void> {
    await database.run(
      `
      UPDATE promocodes SET is_active = NOT is_active WHERE id = ?
    `,
      [id]
    );
  },

  async deletePromocode(id: number): Promise<void> {
    await database.run("DELETE FROM promocodes WHERE id = ?", [id]);
  },

  async getPromocodeStats(id: number): Promise<any> {
    const promocode = await database.get(
      "SELECT * FROM promocodes WHERE id = ?",
      [id]
    );
    if (!promocode) return null;

    const usageHistory = await database.all(
      `
      SELECT u.first_name, u.telegram_id, pu.used_at
      FROM promocode_usage pu
      JOIN users u ON pu.user_id = u.id
      WHERE pu.promocode_id = ?
      ORDER BY pu.used_at DESC
    `,
      [id]
    );

    return {
      ...promocode,
      usage_history: usageHistory,
    };
  },
};
