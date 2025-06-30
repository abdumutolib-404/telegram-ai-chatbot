import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN: string = process.env.BOT_TOKEN as string;
export const OPENROUTER_API_KEY: string = process.env
  .OPENROUTER_API_KEY as string;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required in environment variables");
}

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required in environment variables");
}

// Admin IDs ni .env dan olish
export const ADMIN_IDS: number[] = process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id))
  : [];

// Token limitlarini .env dan olish
export const DEFAULT_DAILY_TOKENS: number = parseInt(
  process.env.DEFAULT_DAILY_TOKENS || "1000"
);
export const DEFAULT_TOTAL_TOKENS: number = parseInt(
  process.env.DEFAULT_TOTAL_TOKENS || "10000"
);

// Rate limiting
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 10;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Telegram API settings
export const TELEGRAM_API_TIMEOUT = 30000; // 30 seconds
export const TELEGRAM_RETRY_ATTEMPTS = 3;
export const TELEGRAM_RETRY_DELAY = 1000; // 1 second
