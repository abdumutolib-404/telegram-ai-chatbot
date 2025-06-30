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
    try {
      // Promokod mavjudligini tekshirish
      const existing = database.get(
        "SELECT id FROM promocodes WHERE code = ?",
        [code]
      );
      if (existing) {
        throw new Error("Bu promokod allaqachon mavjud");
      }

      database.run(
        `
        INSERT INTO promocodes (code, daily_tokens, total_tokens, max_usage, created_by)
        VALUES (?, ?, ?, ?, ?)
      `,
        [code, dailyTokens, totalTokens, maxUsage, createdBy]
      );

      logger.admin("Promocode created", {
        code,
        daily_tokens: dailyTokens,
        total_tokens: totalTokens,
        max_usage: maxUsage,
        created_by: createdBy,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error creating promocode", { error: errorMessage, code });
      throw error;
    }
  },

  async usePromocode(
    code: string,
    userId: number
  ): Promise<{
    success: boolean;
    message: string;
    tokens?: { daily: number; total: number };
  }> {
    try {
      // Promokodni topish
      const promocode = database.get(
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

      // Foydalanuvchini topish
      const user = database.get("SELECT id FROM users WHERE telegram_id = ?", [
        userId,
      ]);
      if (!user) {
        return { success: false, message: "Foydalanuvchi topilmadi" };
      }

      // Foydalanuvchi avval ishlatganligini tekshirish
      const userUsage = database.get(
        `
        SELECT id FROM promocode_usage 
        WHERE promocode_id = ? AND user_id = ?
      `,
        [promocode.id, user.id]
      );

      if (userUsage) {
        return {
          success: false,
          message: "Siz bu promokodni allaqachon ishlatgansiz",
        };
      }

      // Transaction boshlanishi
      const transaction = database.transaction(() => {
        // Foydalanuvchiga tokenlar qo'shish
        database.run(
          `
          UPDATE users SET 
            daily_tokens = daily_tokens + ?, 
            total_tokens = total_tokens + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE telegram_id = ?
        `,
          [promocode.daily_tokens, promocode.total_tokens, userId]
        );

        // Promokod ishlatilganligini belgilash
        database.run(
          `
          INSERT INTO promocode_usage (promocode_id, user_id)
          VALUES (?, ?)
        `,
          [promocode.id, user.id]
        );

        // Promokod ishlatish sonini oshirish
        database.run(
          `
          UPDATE promocodes SET current_usage = current_usage + 1 WHERE id = ?
        `,
          [promocode.id]
        );
      });

      transaction();

      logger.success("Promocode used successfully", {
        code,
        user_id: userId,
        daily_tokens: promocode.daily_tokens,
        total_tokens: promocode.total_tokens,
      });

      return {
        success: true,
        message: "Promokod muvaffaqiyatli ishlatildi!",
        tokens: {
          daily: promocode.daily_tokens,
          total: promocode.total_tokens,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error using promocode", {
        error: errorMessage,
        code,
        user_id: userId,
      });
      return {
        success: false,
        message: "Promokod ishlatishda xatolik yuz berdi",
      };
    }
  },

  async getAllPromocodes(): Promise<Promocode[]> {
    try {
      return database.all("SELECT * FROM promocodes ORDER BY created_at DESC");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting all promocodes", { error: errorMessage });
      return [];
    }
  },

  async getActivePromocodes(): Promise<Promocode[]> {
    try {
      return database.all(`
        SELECT * FROM promocodes 
        WHERE is_active = 1 AND current_usage < max_usage 
        ORDER BY created_at DESC
      `);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting active promocodes", { error: errorMessage });
      return [];
    }
  },

  async togglePromocode(id: number): Promise<void> {
    try {
      database.run(
        `
        UPDATE promocodes SET is_active = NOT is_active WHERE id = ?
      `,
        [id]
      );
      logger.admin("Promocode toggled", { promocode_id: id });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error toggling promocode", {
        error: errorMessage,
        promocode_id: id,
      });
      throw error;
    }
  },

  async deletePromocode(id: number): Promise<void> {
    try {
      database.run("DELETE FROM promocodes WHERE id = ?", [id]);
      logger.admin("Promocode deleted", { promocode_id: id });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error deleting promocode", {
        error: errorMessage,
        promocode_id: id,
      });
      throw error;
    }
  },

  async getPromocodeStats(id: number): Promise<any> {
    try {
      const promocode = database.get("SELECT * FROM promocodes WHERE id = ?", [
        id,
      ]);
      if (!promocode) return null;

      const usageHistory = database.all(
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting promocode stats", {
        error: errorMessage,
        promocode_id: id,
      });
      return null;
    }
  },
};
