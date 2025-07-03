import { database } from "../config/database.js";
import { User } from "../types/bot.js";
import {
  DEFAULT_DAILY_TOKENS,
  DEFAULT_TOTAL_TOKENS,
  DEFAULT_MODEL,
} from "../config/constants.js";
import { logger } from "../utils/logger.js";

export const userService = {
  async ensureUser(telegramUser: any): Promise<User> {
    try {
      const existingUser = database.get(
        "SELECT * FROM users WHERE telegram_id = ?",
        [telegramUser.id]
      );

      if (existingUser) {
        // Kunlik limitni yangilash (har kuni reset)
        const today = new Date().toDateString();
        const lastUpdate = new Date(existingUser.updated_at).toDateString();

        if (today !== lastUpdate) {
          database.run(
            "UPDATE users SET daily_used = 0, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
            [telegramUser.id]
          );
          existingUser.daily_used = 0;
        }

        if (!existingUser.selected_model) {
          database.run(
            "UPDATE users SET selected_model = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
            [DEFAULT_MODEL, telegramUser.id]
          );
          existingUser.selected_model = DEFAULT_MODEL;
        }
          
        return existingUser;
      }

      // Yangi foydalanuvchi yaratish
      database.run(
        `
        INSERT INTO users (telegram_id, username, first_name, last_name, daily_tokens, total_tokens, daily_used, total_used, is_active, registration_completed, selected_model)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, 0, ?)
      `,
        [
          telegramUser.id,
          telegramUser.username || null,
          telegramUser.first_name,
          telegramUser.last_name || null,
          DEFAULT_DAILY_TOKENS,
          DEFAULT_TOTAL_TOKENS,
          DEFAULT_MODEL,
        ]
      );

      const newUser = database.get(
        "SELECT * FROM users WHERE telegram_id = ?",
        [telegramUser.id]
      );
      logger.success("New user created", {
        user_id: telegramUser.id,
        name: telegramUser.first_name,
      });
      return newUser;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error ensuring user", {
        error: errorMessage,
        user_id: telegramUser.id,
      });
      throw error;
    }
  },

  async getUser(telegramId: number): Promise<User | null> {
    try {
      return database.get("SELECT * FROM users WHERE telegram_id = ?", [
        telegramId,
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting user", {
        error: errorMessage,
        user_id: telegramId,
      });
      return null;
    }
  },

  async updateSelectedModel(
    telegramId: number,
    modelId: string
  ): Promise<void> {
    try {
      database.run(
        "UPDATE users SET selected_model = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
        [modelId, telegramId]
      );
      logger.info("Model updated", { user_id: telegramId, model: modelId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error updating model", {
        error: errorMessage,
        user_id: telegramId,
      });
      throw error;
    }
  },

  async updateTokenUsage(telegramId: number, tokens: number): Promise<void> {
    try {
      const user = await this.getUser(telegramId);
      if (!user) {
        logger.warning("User not found for token update", {
          user_id: telegramId,
        });
        return;
      }

      database.run(
        `
        UPDATE users SET 
          daily_used = daily_used + ?, 
          total_used = total_used + ?, 
          updated_at = CURRENT_TIMESTAMP 
        WHERE telegram_id = ?
      `,
        [tokens, tokens, telegramId]
      );

      logger.info("Token usage updated", { user_id: telegramId, tokens });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error updating token usage", {
        error: errorMessage,
        user_id: telegramId,
      });
      throw error;
    }
  },

  async updateUserInfo(
    telegramId: number,
    info: { name?: string; age?: number; interests?: string }
  ): Promise<void> {
    try {
      const fields = [];
      const values = [];

      if (info.name !== undefined) {
        fields.push("first_name = ?");
        values.push(info.name);
      }

      if (info.age !== undefined) {
        fields.push("age = ?");
        values.push(info.age);
      }

      if (info.interests !== undefined) {
        fields.push("interests = ?");
        values.push(info.interests);
      }

      if (fields.length > 0) {
        fields.push("updated_at = CURRENT_TIMESTAMP");
        values.push(telegramId);
        database.run(
          `UPDATE users SET ${fields.join(", ")} WHERE telegram_id = ?`,
          values
        );
        logger.info("User info updated", {
          user_id: telegramId,
          fields: Object.keys(info),
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error updating user info", {
        error: errorMessage,
        user_id: telegramId,
      });
      throw error;
    }
  },

  async completeRegistration(telegramId: number): Promise<void> {
    try {
      database.run(
        "UPDATE users SET registration_completed = 1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
        [telegramId]
      );
      logger.success("Registration completed", { user_id: telegramId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error completing registration", {
        error: errorMessage,
        user_id: telegramId,
      });
      throw error;
    }
  },

  async addTokens(
    telegramId: number,
    dailyTokens: number,
    totalTokens: number
  ): Promise<void> {
    try {
      const user = await this.getUser(telegramId);
      if (!user) {
        throw new Error("Foydalanuvchi topilmadi");
      }

      database.run(
        `
        UPDATE users SET 
          daily_tokens = daily_tokens + ?, 
          total_tokens = total_tokens + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ?
      `,
        [dailyTokens, totalTokens, telegramId]
      );

      logger.admin("Tokens added to user", {
        user_id: telegramId,
        daily_added: dailyTokens,
        total_added: totalTokens,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error adding tokens", {
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
      const user = await this.getUser(telegramId);
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

      database.run(
        `
        UPDATE users SET 
          daily_tokens = daily_tokens - ?, 
          total_tokens = total_tokens - ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ?
      `,
        [dailyTokens, totalTokens, telegramId]
      );

      logger.admin("Tokens removed from user", {
        user_id: telegramId,
        daily_removed: dailyTokens,
        total_removed: totalTokens,
      });

      return { success: true, message: "Tokenlar muvaffaqiyatli ayirildi" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error removing tokens", {
        error: errorMessage,
        user_id: telegramId,
      });
      return {
        success: false,
        message: "Tokenlarni ayirishda xatolik yuz berdi",
      };
    }
  },
};
