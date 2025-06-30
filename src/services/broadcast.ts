import { database } from "../config/database.js";
import { Telegraf } from "telegraf";
import { logger } from "../utils/logger.js";

export const broadcastService = {
  async broadcastToAll(bot: Telegraf, message: string): Promise<number> {
    try {
      const users = database.all(
        "SELECT telegram_id FROM users WHERE is_active = 1 AND telegram_id != 1087968824"
      );
      logger.broadcast("Starting broadcast to all users", {
        total_users: users.length,
      });

      let successCount = 0;
      for (const user of users) {
        try {
          await bot.telegram.sendMessage(user.telegram_id, message);
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 50)); // Rate limiting
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.warning(`Broadcast failed for user`, {
            user_id: user.telegram_id,
            error: errorMessage,
          });
        }
      }

      logger.success("Broadcast to all completed", {
        success_count: successCount,
        total_users: users.length,
      });
      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Broadcast to all error", { error: errorMessage });
      return 0;
    }
  },

  async broadcastToActive(bot: Telegraf, message: string): Promise<number> {
    try {
      const users = database.all(`
        SELECT telegram_id FROM users 
        WHERE is_active = 1 AND date(updated_at) >= date('now', '-7 days') AND telegram_id != 1087968824
      `);
      logger.broadcast("Starting broadcast to active users", {
        total_users: users.length,
      });

      let successCount = 0;
      for (const user of users) {
        try {
          await bot.telegram.sendMessage(user.telegram_id, message);
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.warning(`Broadcast failed for user`, {
            user_id: user.telegram_id,
            error: errorMessage,
          });
        }
      }

      logger.success("Broadcast to active completed", {
        success_count: successCount,
        total_users: users.length,
      });
      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Broadcast to active error", { error: errorMessage });
      return 0;
    }
  },

  async broadcastToCount(
    bot: Telegraf,
    message: string,
    count: number
  ): Promise<number> {
    try {
      const users = database.all(
        "SELECT telegram_id FROM users WHERE is_active = 1 AND telegram_id != 1087968824 LIMIT ?",
        [count]
      );
      logger.broadcast("Starting broadcast to count users", {
        total_users: users.length,
        requested_count: count,
      });

      let successCount = 0;
      for (const user of users) {
        try {
          await bot.telegram.sendMessage(user.telegram_id, message);
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.warning(`Broadcast failed for user`, {
            user_id: user.telegram_id,
            error: errorMessage,
          });
        }
      }

      logger.success("Broadcast to count completed", {
        success_count: successCount,
        total_users: users.length,
      });
      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Broadcast to count error", { error: errorMessage });
      return 0;
    }
  },

  async broadcastToGroups(bot: Telegraf, message: string): Promise<number> {
    try {
      // Guruhlar ro'yxatini olish (bu yerda guruh ID'larini saqlash kerak)
      const groups: number[] = []; // Bu yerda guruh ID'lari bo'lishi kerak
      logger.broadcast("Starting broadcast to groups", {
        total_groups: groups.length,
      });

      let successCount = 0;
      for (const groupId of groups) {
        try {
          await bot.telegram.sendMessage(groupId, message);
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.warning(`Group broadcast failed`, {
            group_id: groupId,
            error: errorMessage,
          });
        }
      }

      logger.success("Broadcast to groups completed", {
        success_count: successCount,
        total_groups: groups.length,
      });
      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Broadcast to groups error", { error: errorMessage });
      return 0;
    }
  },

  // Media broadcast functions
  async broadcastMediaToAll(
    bot: Telegraf,
    message: any,
    caption: string
  ): Promise<number> {
    try {
      const users = database.all(
        "SELECT telegram_id FROM users WHERE is_active = 1 AND telegram_id != 1087968824"
      );
      logger.broadcast("Starting media broadcast to all users", {
        total_users: users.length,
      });

      let successCount = 0;
      for (const user of users) {
        try {
          if ("photo" in message && message.photo) {
            await bot.telegram.sendPhoto(
              user.telegram_id,
              message.photo[message.photo.length - 1].file_id,
              { caption }
            );
          } else if ("video" in message && message.video) {
            await bot.telegram.sendVideo(
              user.telegram_id,
              message.video.file_id,
              { caption }
            );
          } else if ("animation" in message && message.animation) {
            await bot.telegram.sendAnimation(
              user.telegram_id,
              message.animation.file_id,
              { caption }
            );
          } else if ("document" in message && message.document) {
            await bot.telegram.sendDocument(
              user.telegram_id,
              message.document.file_id,
              { caption }
            );
          }
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.warning(`Media broadcast failed for user`, {
            user_id: user.telegram_id,
            error: errorMessage,
          });
        }
      }

      logger.success("Media broadcast to all completed", {
        success_count: successCount,
        total_users: users.length,
      });
      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Media broadcast to all error", { error: errorMessage });
      return 0;
    }
  },

  async broadcastMediaToActive(
    bot: Telegraf,
    message: any,
    caption: string
  ): Promise<number> {
    try {
      const users = database.all(`
        SELECT telegram_id FROM users 
        WHERE is_active = 1 AND date(updated_at) >= date('now', '-7 days') AND telegram_id != 1087968824
      `);
      logger.broadcast("Starting media broadcast to active users", {
        total_users: users.length,
      });

      let successCount = 0;
      for (const user of users) {
        try {
          if ("photo" in message && message.photo) {
            await bot.telegram.sendPhoto(
              user.telegram_id,
              message.photo[message.photo.length - 1].file_id,
              { caption }
            );
          } else if ("video" in message && message.video) {
            await bot.telegram.sendVideo(
              user.telegram_id,
              message.video.file_id,
              { caption }
            );
          } else if ("animation" in message && message.animation) {
            await bot.telegram.sendAnimation(
              user.telegram_id,
              message.animation.file_id,
              { caption }
            );
          } else if ("document" in message && message.document) {
            await bot.telegram.sendDocument(
              user.telegram_id,
              message.document.file_id,
              { caption }
            );
          }
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.warning(`Media broadcast failed for user`, {
            user_id: user.telegram_id,
            error: errorMessage,
          });
        }
      }

      logger.success("Media broadcast to active completed", {
        success_count: successCount,
        total_users: users.length,
      });
      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Media broadcast to active error", { error: errorMessage });
      return 0;
    }
  },

  async broadcastMediaToCount(
    bot: Telegraf,
    message: any,
    caption: string,
    count: number
  ): Promise<number> {
    try {
      const users = database.all(
        "SELECT telegram_id FROM users WHERE is_active = 1 AND telegram_id != 1087968824 LIMIT ?",
        [count]
      );
      logger.broadcast("Starting media broadcast to count users", {
        total_users: users.length,
        requested_count: count,
      });

      let successCount = 0;
      for (const user of users) {
        try {
          if ("photo" in message && message.photo) {
            await bot.telegram.sendPhoto(
              user.telegram_id,
              message.photo[message.photo.length - 1].file_id,
              { caption }
            );
          } else if ("video" in message && message.video) {
            await bot.telegram.sendVideo(
              user.telegram_id,
              message.video.file_id,
              { caption }
            );
          } else if ("animation" in message && message.animation) {
            await bot.telegram.sendAnimation(
              user.telegram_id,
              message.animation.file_id,
              { caption }
            );
          } else if ("document" in message && message.document) {
            await bot.telegram.sendDocument(
              user.telegram_id,
              message.document.file_id,
              { caption }
            );
          }
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.warning(`Media broadcast failed for user`, {
            user_id: user.telegram_id,
            error: errorMessage,
          });
        }
      }

      logger.success("Media broadcast to count completed", {
        success_count: successCount,
        total_users: users.length,
      });
      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Media broadcast to count error", { error: errorMessage });
      return 0;
    }
  },

  async broadcastMediaToGroups(
    bot: Telegraf,
    message: any,
    caption: string
  ): Promise<number> {
    try {
      const groups: number[] = []; // Bu yerda guruh ID'lari bo'lishi kerak
      logger.broadcast("Starting media broadcast to groups", {
        total_groups: groups.length,
      });

      let successCount = 0;
      for (const groupId of groups) {
        try {
          if ("photo" in message && message.photo) {
            await bot.telegram.sendPhoto(
              groupId,
              message.photo[message.photo.length - 1].file_id,
              { caption }
            );
          } else if ("video" in message && message.video) {
            await bot.telegram.sendVideo(groupId, message.video.file_id, {
              caption,
            });
          } else if ("animation" in message && message.animation) {
            await bot.telegram.sendAnimation(
              groupId,
              message.animation.file_id,
              { caption }
            );
          } else if ("document" in message && message.document) {
            await bot.telegram.sendDocument(groupId, message.document.file_id, {
              caption,
            });
          }
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.warning(`Group media broadcast failed`, {
            group_id: groupId,
            error: errorMessage,
          });
        }
      }

      logger.success("Media broadcast to groups completed", {
        success_count: successCount,
        total_groups: groups.length,
      });
      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Media broadcast to groups error", { error: errorMessage });
      return 0;
    }
  },
};
