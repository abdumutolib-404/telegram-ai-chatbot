import { Markup } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";

export class KeyboardBuilder {
  private buttons: Array<Array<{ text: string; callback_data: string }>> = [];

  addRow(buttons: Array<{ text: string; callback_data: string }>): this {
    if (buttons && buttons.length > 0) {
      this.buttons.push(buttons);
    }
    return this;
  }

  addButton(text: string, callback_data: string): this {
    if (text && callback_data) {
      this.buttons.push([{ text, callback_data }]);
    }
    return this;
  }

  build(): { reply_markup: InlineKeyboardMarkup } {
    if (this.buttons.length === 0) {
      // Return empty keyboard if no buttons
      return Markup.inlineKeyboard([]);
    }

    try {
      const keyboard = this.buttons.map((row) =>
        row.map((button) =>
          Markup.button.callback(button.text, button.callback_data)
        )
      );

      return Markup.inlineKeyboard(keyboard);
    } catch (error) {
      // Return empty keyboard on error
      return Markup.inlineKeyboard([]);
    }
  }

  static createMainMenu(isAdmin: boolean = false): {
    reply_markup: InlineKeyboardMarkup;
  } {
    const builder = new KeyboardBuilder();

    try {
      builder.addButton("💬 Suhbat boshlash", "start_chat");
      builder.addButton("🤖 Model tanlash", "select_model");
      builder.addRow([
        { text: "📊 Statistika", callback_data: "stats" },
        { text: "💰 Balans", callback_data: "balance" },
      ]);
      builder.addButton("🎫 Promokod", "use_promocode");

      if (isAdmin) {
        builder.addButton("⚙️ Admin Panel", "admin_panel");
      }

      return builder.build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createBackButton(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton("🏠 Bosh sahifa", "back_to_main")
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createAdminPanel(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton("📊 Statistika", "admin_stats")
        .addRow([
          { text: "💰 Token qo'shish", callback_data: "admin_add_tokens" },
          { text: "💸 Token ayirish", callback_data: "admin_remove_tokens" },
        ])
        .addButton("🎫 Promokodlar", "admin_promocodes")
        .addButton("📢 Broadcast", "admin_broadcast")
        .addButton("🤖 Modellar", "admin_models")
        .addButton("📋 Buyruqlar", "admin_commands")
        .addButton("🏠 Bosh sahifa", "back_to_main")
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createRegistrationMenu(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton("📝 Ro'yxatdan o'tish", "start_registration")
        .addButton("⏭️ O'tkazib yuborish", "skip_registration")
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }
}

export function validateKeyboard(keyboard: any): boolean {
  try {
    if (!keyboard || !keyboard.reply_markup) {
      return false;
    }

    const markup = keyboard.reply_markup;

    if (!markup.inline_keyboard || !Array.isArray(markup.inline_keyboard)) {
      return false;
    }

    // Allow empty keyboards
    if (markup.inline_keyboard.length === 0) {
      return true;
    }

    // Validate each row and button
    for (const row of markup.inline_keyboard) {
      if (!Array.isArray(row)) {
        return false;
      }

      for (const button of row) {
        if (!button || typeof button !== "object") {
          return false;
        }

        if (!button.text || typeof button.text !== "string") {
          return false;
        }

        // Check for callback_data or other valid button properties
        if (
          !button.callback_data &&
          !button.url &&
          !button.switch_inline_query &&
          !button.switch_inline_query_current_chat
        ) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}
