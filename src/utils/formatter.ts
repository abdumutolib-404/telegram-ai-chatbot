/**
 * Telegram formatter utility
 * Supports HTML, Markdown V2, and plain text formatting
 */
import {DEFAULT_DAILY_TOKENS , DEFAULT_TOTAL_TOKENS , PREMIUM_PRICE} from './config/constants.js'
export class TelegramFormatter {
  /**
   * Escape special characters for HTML
   */
  static escapeHTML(text: string): string {
    if (!text || typeof text !== "string") return "";

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  /**
   * Escape special characters for Markdown V2
   */
  static escapeMarkdown(text: string): string {
    if (!text || typeof text !== "string") return "";

    // Characters that need to be escaped in Markdown V2
    const specialChars = [
      "_",
      "*",
      "[",
      "]",
      "(",
      ")",
      "~",
      "`",
      ">",
      "#",
      "+",
      "-",
      "=",
      "|",
      "{",
      "}",
      ".",
      "!",
    ];

    let escaped = text;
    for (const char of specialChars) {
      escaped = escaped.replace(
        new RegExp("\\" + char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        "\\" + char
      );
    }

    return escaped;
  }

  /**
   * Convert text to HTML format
   */
  static toHTML(text: string): string {
    if (!text) return "";

    return text
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>") // Bold
      .replace(/\*([^*]+)\*/g, "<b>$1</b>") // Bold (single asterisk)
      .replace(/_([^_]+)_/g, "<i>$1</i>") // Italic
      .replace(/`([^`]+)`/g, "<code>$1</code>") // Code
      .replace(/~([^~]+)~/g, "<s>$1</s>") // Strikethrough
      .replace(/__([^_]+)__/g, "<u>$1</u>") // Underline
      .replace(/\\(.)/g, "$1"); // Remove escapes
  }

  /**
   * Convert text to Markdown V2 format
   */
  static toMarkdownV2(text: string): string {
    if (!text) return "";

    // First escape special characters, then apply formatting
    let escaped = this.escapeMarkdown(text);

    return escaped
      .replace(/\*\*([^*]+)\*\*/g, "*$1*") // Bold
      .replace(/_([^_]+)_/g, "_$1_") // Italic
      .replace(/`([^`]+)`/g, "`$1`") // Code (no escaping inside)
      .replace(/~([^~]+)~/g, "~$1~") // Strikethrough
      .replace(/__([^_]+)__/g, "__$1__"); // Underline
  }

  /**
   * Format text as bold (HTML)
   */
  static bold(text: string): string {
    if (!text) return "";
    return `<b>${this.escapeHTML(text)}</b>`;
  }

  /**
   * Format text as italic (HTML)
   */
  static italic(text: string): string {
    if (!text) return "";
    return `<i>${this.escapeHTML(text)}</i>`;
  }

  /**
   * Format text as code (HTML)
   */
  static code(text: string): string {
    if (!text) return "";
    return `<code>${this.escapeHTML(text)}</code>`;
  }

  /**
   * Format text as code block (HTML)
   */
  static codeBlock(text: string): string {
    if (!text) return "";
    return `<pre>${this.escapeHTML(text)}</pre>`;
  }

  /**
   * Format text as strikethrough (HTML)
   */
  static strikethrough(text: string): string {
    if (!text) return "";
    return `<s>${this.escapeHTML(text)}</s>`;
  }

  /**
   * Format text as underline (HTML)
   */
  static underline(text: string): string {
    if (!text) return "";
    return `<u>${this.escapeHTML(text)}</u>`;
  }

  /**
   * Create a link (HTML)
   */
  static link(text: string, url: string): string {
    if (!text || !url) return text || "";
    return `<a href="${url}">${this.escapeHTML(text)}</a>`;
  }

  /**
   * Create formatted welcome message for new users
   */
  static formatWelcomeNew(firstName: string): string {
    return [
      `🎉 Assalomu alaykum, ${this.bold(firstName)}!`,
      "",
      "🤖 Men AI chatbot man. Sizga turli AI modellari bilan suhbatlashishda yordam beraman.Eslatma men xatolar qilishim mumkin shuning uchun muhim ma'lumotlarni tekshiring!!!",
      "",
      `Sizga kunlik${dailyLimit} va oylik ${monthlyLimit} taqdim etiladi va Premium modelarga bitta so'rov yuborish imkoniyati keyin esa pro obunani sotib oling! Premium narxi: ${premiumPrice}`,
      "",
      "📝 Yaxshiroq xizmat ko'rsatish uchun qisqacha ma'lumot bering yoki o'tkazib yuboring.",
    ].join("\n");
  }

  /**
   * Create formatted welcome message
   */
l  static formatWelcome(firstName: string, userId: number): string {
    return [
      `🎉 Assalomu alaykum, ${this.bold(firstName)}!`,
      "",
      "🤖 Men AI chatbot man. Sizga turli AI modellari bilan suhbatlashishda yordam beraman.",
      "",
      `Sizga kunlik${dailyLimit} va oylik ${monthlyLimit} taqdim etiladi va Premium modelarga bitta so'rov yuborish imkoniyati keyin esa pro obunani sotib oling! Premium narxi: ${premiumPrice}`,
      "",
      "📝 Guruhda: Reply yoki @mention qiling",
      '💬 Shaxsiy chatda: "Suhbat boshlash" tugmasini bosing',
      "",
      `🆔 Sizning ID: ${this.code(String(userId))}`,
    ].join("\n");
  }

  /**
   * Format registration steps
   */
  static formatRegistrationStep(step: string): string {
    switch (step) {
      case "name":
        return [
          "👤 Ismingizni kiriting:",
          "",
          "💡 Bu ma'lumot sizga shaxsiylashtirilgan javoblar berish uchun kerak.",
        ].join("\n");
      case "age":
        return [
          "👤 Yoshingizni kiriting (masalan: 25):",
          "",
          "💡 Bu ma'lumot sizga mos javoblar berish uchun kerak.",
        ].join("\n");
      case "interests":
        return [
          "🎯 Qiziqishlaringizni kiriting (masalan: dasturlash, sport, musiqa):",
          "",
          "💡 Bu sizga tegishli javoblar berish uchun kerak.",
        ].join("\n");
      default:
        return "Ma'lumot kiriting:";
    }
  }

  /**
   * Format registration completion
   */
  static formatRegistrationComplete(userId: number): string {
    return [
      this.formatSuccess("Ro'yxatdan o'tish yakunlandi!"),
      "",
      "🤖 Endi AI modellari bilan suhbatlashishingiz mumkin.",
      "",
      `🆔 Sizning ID: ${this.code(String(userId))}`,
    ].join("\n");
  }

  /**
   * Format registration skipped
   */
  static formatRegistrationSkipped(userId: number): string {
    return [
      this.formatSuccess("Xush kelibsiz!"),
      "",
      "🤖 Endi AI modellari bilan suhbatlashishingiz mumkin.",
      "",
      `🆔 Sizning ID: ${this.code(String(userId))}`,
    ].join("\n");
  }

  /**
   * Format chat mode start
   */
  static formatChatModeStart(modelName: string): string {
    return [
      this.bold("💬 Suhbat rejimi yoqildi!"),
      "",
      `🤖 Tanlangan model: ${this.code(modelName)}`,
      "",
      "📝 Endi har qanday xabar yozsangiz, AI javob beradi.",
      '🔚 Suhbatni tugatish uchun "Suhbatni tugatish" tugmasini bosing.',
    ].join("\n");
  }

  /**
   * Format chat mode end
   */
  static formatChatModeEnd(): string {
    return [
      this.formatSuccess("Suhbat rejimi tugatildi!"),
      "",
      "🏠 Asosiy menyuga qaytdingiz.",
    ].join("\n");
  }

  /**
   * Format model selected
   */
  static formatModelSelected(modelName: string): string {
    return [
      this.formatSuccess(`Model tanlandi: ${modelName}`),
      "",
      this.formatWarning(
        "Eslatma: Barcha AI modellari O'zbek tilini bir xil darajada bilmaydi. Agar javob ingliz tilida kelsa, \"O'zbek tilida javob ber\" deb so'rang."
      ),
    ].join("\n");
  }

  /**
   * Format promocode input
   */
  static formatPromocodeInput(): string {
    return [
      "🎫 Promokod kiriting:",
      "",
      "Promokod kodini yozing (masalan: BONUS2025)",
      "",
      "💡 Promokod orqali qo'shimcha tokenlar olishingiz mumkin.",
    ].join("\n");
  }

  /**
   * Format promocode usage instructions
   */
  static formatPromocodeUsage(): string {
    return [
      this.formatError("Format: /promocode <kod>"),
      "",
      this.bold("Misol:"),
      this.code("/promocode BONUS2025"),
    ].join("\n");
  }

  /**
   * Format token limit message
   */
  static formatTokenLimit(userId: number): string {
    return [
      this.formatError("Token limitingiz tugagan!"),
      "",
      "💡 Admin bilan bog'laning yoki ertaga qayta urinib ko'ring.",
      `🆔 Sizning ID: ${this.code(String(userId))}`,
      "👨‍💼 Admin: @abdulahadovAbdumutolib",
    ].join("\n");
  }

  /**
   * Format admin token usage instructions
   */
  static formatAdminTokenUsage(operation: "add" | "remove"): string {
    const verb = operation === "add" ? "qo'shish" : "ayirish";
    const command = operation === "add" ? "add_tokens" : "remove_tokens";

    return [
      this.formatError(
        `Format: /${command} <user_id> <daily_tokens> <total_tokens>`
      ),
      "",
      this.bold("Misol:"),
      this.code(`/${command} 123456789 1000 5000`),
    ].join("\n");
  }

  /**
   * Create formatted stats message
   */
  static formatStats(stats: any): string {
    return [
      this.bold("📊 Sizning statistikangiz:"),
      "",
      `🆔 User ID: ${this.code(String(stats.user_id || "N/A"))}`,
      `📅 Bugungi so'rovlar: ${stats.daily_requests || 0}`,
      `🔥 Bugungi tokenlar: ${stats.daily_tokens || 0}`,
      `📈 Jami so'rovlar: ${stats.total_requests || 0}`,
      `💎 Jami tokenlar: ${stats.total_tokens || 0}`,
      `📆 Ro'yxatdan o'tgan: ${
        stats.created_at
          ? new Date(stats.created_at).toLocaleDateString("uz-UZ")
          : "N/A"
      }`,
    ].join("\n");
  }

  /**
   * Create formatted balance message
   */
  static formatBalance(user: any): string {
    const remainingDaily = (user.daily_tokens || 0) - (user.daily_used || 0);
    const remainingTotal = (user.total_tokens || 0) - (user.total_used || 0);

    return [
      this.bold("💰 Sizning balansingiz:"),
      "",
      `🆔 User ID: ${this.code(String(user.telegram_id || "N/A"))}`,
      `🔥 Qolgan kunlik: ${remainingDaily} token`,
      `💎 Qolgan umumiy: ${remainingTotal} token`,
    ].join("\n");
  }

  /**
   * Create formatted admin stats message
   */
  static formatAdminStats(stats: any): string {
    return [
      this.bold("📊 Tizim statistikasi:"),
      "",
      `👥 Jami foydalanuvchilar: ${stats.total_users || 0}`,
      `📅 Bugungi faol: ${stats.daily_active || 0}`,
      `💬 Bugungi so'rovlar: ${stats.daily_requests || 0}`,
      `🔥 Bugungi tokenlar: ${stats.daily_tokens || 0}`,
      `📈 Jami so'rovlar: ${stats.total_requests || 0}`,
      `💎 Jami tokenlar: ${stats.total_tokens || 0}`,
    ].join("\n");
  }

  /**
   * Create formatted help message
   */
  static formatHelp(user: any, isAdmin: boolean = false): string {
    const lines = [
      this.bold("🤖 AI Chatbot Yordam"),
      "",
      this.bold("Asosiy buyruqlar:"),
      `${this.code("/start")} - Botni qayta ishga tushirish`,
      `${this.code("/model")} - AI model tanlash`,
      `${this.code("/stats")} - Statistikangizni ko'rish`,
      `${this.code("/balance")} - Qolgan tokenlarni tekshirish`,
      `${this.code("/promocode <kod>")} - Promokod ishlatish`,
      `${this.code("/help")} - Bu yordam xabari`,
      "",
    ];

    if (isAdmin) {
      lines.push(
        this.bold("Admin buyruqlari:"),
        `${this.code("/admin")} - Admin panel`,
        `${this.code(
          "/add_tokens <user_id> <daily> <total>"
        )} - Token qo'shish`,
        `${this.code(
          "/remove_tokens <user_id> <daily> <total>"
        )} - Token ayirish`,
        `${this.code(
          "/add_promo <code> <daily> <total> <usage>"
        )} - Promokod yaratish`,
        `${this.code("/broadcast <xabar>")} - Xabar yuborish`,
        ""
      );
    }

    lines.push(
      this.bold("Qanday foydalanish:"),
      '• Shaxsiy chatda: "Suhbat boshlash" tugmasini bosing',
      "• Guruhda: Botga reply qiling yoki @mention qiling",
      "",
      this.bold("Sizning ma'lumotlaringiz:"),
      `🆔 ID: ${this.code(String(user?.telegram_id || "N/A"))}`,
      `🔥 Kunlik limit: ${user?.daily_tokens || 0} token`,
      `💎 Umumiy limit: ${user?.total_tokens || 0} token`,
      "",
      this.bold("Token tugasa:"),
      "Admin bilan bog'laning: @abdulahadovAbdumutolib"
    );

    return lines.join("\n");
  }

  /**
   * Create formatted promocode success message
   */
  static formatPromocodeSuccess(
    message: string,
    dailyTokens: number,
    totalTokens: number
  ): string {
    return [
      this.formatSuccess(message),
      "",
      this.bold("🎁 Qo'shildi:"),
      `🔥 Kunlik: +${dailyTokens} token`,
      `💎 Umumiy: +${totalTokens} token`,
    ].join("\n");
  }

  /**
   * Create formatted token operation message
   */
  static formatTokenOperation(
    userId: string,
    dailyTokens: number,
    totalTokens: number,
    operation: "added" | "removed"
  ): string {
    const operationText = operation === "added" ? "qo'shildi" : "ayirildi";
    const operationSymbol = operation === "added" ? "+" : "-";

    return [
      this.formatSuccess(
        `Foydalanuvchi ${userId} ga tokenlar ${operationText}!`
      ),
      "",
      this.bold(`📊 ${operation === "added" ? "Qo'shildi" : "Ayirildi"}:`),
      `🔥 Kunlik: ${operationSymbol}${dailyTokens}`,
      `💎 Umumiy: ${operationSymbol}${totalTokens}`,
    ].join("\n");
  }

  /**
   * Create formatted error message
   */
  static formatError(message: string): string {
    return `❌ ${message}`;
  }

  /**
   * Create formatted success message
   */
  static formatSuccess(message: string): string {
    return `✅ ${message}`;
  }

  /**
   * Create formatted warning message
   */
  static formatWarning(message: string): string {
    return `⚠️ ${message}`;
  }

  /**
   * Create formatted info message
   */
  static formatInfo(message: string): string {
    return `ℹ️ ${message}`;
  }

  /**
   * Create plain text version (fallback)
   */
  static toPlainText(text: string): string {
    if (!text) return "";

    // Remove all HTML and Markdown formatting
    return text
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove bold (single asterisk)
      .replace(/_([^_]+)_/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove code
      .replace(/~([^~]+)~/g, "$1") // Remove strikethrough
      .replace(/__([^_]+)__/g, "$1") // Remove underline
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
      .replace(/\\(.)/g, "$1") // Remove escapes
      .replace(/&amp;/g, "&") // Decode HTML entities
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'");
  }
}

export default TelegramFormatter;
