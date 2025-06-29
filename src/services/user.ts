import { database } from "../config/database.js";
import { User } from "../types/bot.js";
import {
  DEFAULT_DAILY_TOKENS,
  DEFAULT_TOTAL_TOKENS,
} from "../config/constants.js";

export const userService = {
  async ensureUser(telegramUser: any): Promise<User> {
    const existingUser = await database.get(
      "SELECT * FROM users WHERE telegram_id = ?",
      [telegramUser.id]
    );

    if (existingUser) {
      // Kunlik limitni yangilash (har kuni reset)
      const today = new Date().toDateString();
      const lastUpdate = new Date(existingUser.updated_at).toDateString();

      if (today !== lastUpdate) {
        await database.run(
          "UPDATE users SET daily_used = 0, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
          [telegramUser.id]
        );
        existingUser.daily_used = 0;
      }

      return existingUser;
    }

    await database.run(
      `
      INSERT INTO users (telegram_id, username, first_name, last_name, daily_tokens, total_tokens, daily_used, total_used, is_active, registration_completed)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, 0)
    `,
      [
        telegramUser.id,
        telegramUser.username,
        telegramUser.first_name,
        telegramUser.last_name,
        DEFAULT_DAILY_TOKENS,
        DEFAULT_TOTAL_TOKENS,
      ]
    );

    return await database.get("SELECT * FROM users WHERE telegram_id = ?", [
      telegramUser.id,
    ]);
  },

  async getUser(telegramId: number): Promise<User | null> {
    return await database.get("SELECT * FROM users WHERE telegram_id = ?", [
      telegramId,
    ]);
  },

  async updateSelectedModel(
    telegramId: number,
    modelId: string
  ): Promise<void> {
    await database.run(
      "UPDATE users SET selected_model = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
      [modelId, telegramId]
    );
  },

  async updateTokenUsage(telegramId: number, tokens: number): Promise<void> {
    const user = await this.getUser(telegramId);
    if (!user) return;

    await database.run(
      `
      UPDATE users SET 
        daily_used = daily_used + ?, 
        total_used = total_used + ?, 
        updated_at = CURRENT_TIMESTAMP 
      WHERE telegram_id = ?
    `,
      [tokens, tokens, telegramId]
    );
  },

  async updateUserInfo(
    telegramId: number,
    info: { name?: string; age?: number; interests?: string }
  ): Promise<void> {
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
      await database.run(
        `UPDATE users SET ${fields.join(", ")} WHERE telegram_id = ?`,
        values
      );
    }
  },

  async completeRegistration(telegramId: number): Promise<void> {
    await database.run(
      "UPDATE users SET registration_completed = 1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
      [telegramId]
    );
  },
};
