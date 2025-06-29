import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

// Admin IDs ni .env dan olish
export const ADMIN_IDS = process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(",").map((id) => parseInt(id.trim()))
  : [];

// Token limitlarini .env dan olish
export const DEFAULT_DAILY_TOKENS = parseInt(
  process.env.DEFAULT_DAILY_TOKENS || "150000"
);
export const DEFAULT_TOTAL_TOKENS = parseInt(
  process.env.DEFAULT_TOTAL_TOKENS || "1000000"
);
