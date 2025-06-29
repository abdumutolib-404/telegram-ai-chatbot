import sqlite3 from "sqlite3";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = path.join(__dirname, "../../bot.db");
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  private async init() {
    logger.database("Initializing database...");

    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT,
        age INTEGER,
        interests TEXT,
        daily_tokens INTEGER DEFAULT 1000,
        total_tokens INTEGER DEFAULT 10000,
        daily_used INTEGER DEFAULT 0,
        total_used INTEGER DEFAULT 0,
        selected_model TEXT,
        is_active BOOLEAN DEFAULT 1,
        registration_completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        max_tokens INTEGER DEFAULT 4000,
        cost_per_token REAL DEFAULT 0.00001,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        requests INTEGER DEFAULT 0,
        tokens INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Promokodlar jadvali
    await this.run(`
      CREATE TABLE IF NOT EXISTS promocodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        daily_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        max_usage INTEGER NOT NULL,
        current_usage INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Promokod ishlatish tarixi
    await this.run(`
      CREATE TABLE IF NOT EXISTS promocode_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        promocode_id INTEGER REFERENCES promocodes(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(promocode_id, user_id)
      )
    `);

    // Barcha modellarni qo'shish
    const models = [
      [
        "deepseek/deepseek-chat-v3-0324:free",
        "DeepSeek Chat V3",
        "DeepSeek",
        8000,
      ],
      ["deepseek/deepseek-r1-0528:free", "DeepSeek R1", "DeepSeek", 8000],
      ["deepseek/deepseek-chat:free", "DeepSeek Chat", "DeepSeek", 4000],
      ["deepseek/deepseek-r1:free", "DeepSeek R1 Base", "DeepSeek", 8000],
      [
        "tngtech/deepseek-r1t-chimera:free",
        "DeepSeek R1T Chimera",
        "TNG Tech",
        8000,
      ],
      ["google/gemini-2.0-flash-exp:free", "Gemini 2.0 Flash", "Google", 8000],
      ["qwen/qwen3-32b:free", "Qwen 3 32B", "Alibaba", 8000],
      ["mistralai/mistral-nemo:free", "Mistral Nemo", "Mistral AI", 4000],
      ["qwen/qwen3-235b-a22b:free", "Qwen 3 235B A22B", "Alibaba", 16000],
      ["qwen/qwen3-14b:free", "Qwen 3 14B", "Alibaba", 8000],
      ["qwen/qwq-32b:free", "QwQ 32B", "Alibaba", 8000],
      ["google/gemma-3-27b-it:free", "Gemma 3 27B", "Google", 8000],
      [
        "deepseek/deepseek-r1-0528-qwen3-8b:free",
        "DeepSeek R1 Qwen3 8B",
        "DeepSeek",
        8000,
      ],
      ["meta-llama/llama-4-maverick:free", "Llama 4 Maverick", "Meta", 8000],
      ["microsoft/mai-ds-r1:free", "MAI DS R1", "Microsoft", 4000],
      ["qwen/qwen2.5-vl-72b-instruct:free", "Qwen 2.5 VL 72B", "Alibaba", 8000],
      [
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "Mistral Small 3.1",
        "Mistral AI",
        8000,
      ],
      ["mistralai/devstral-small:free", "Devstral Small", "Mistral AI", 4000],
      ["deepseek/deepseek-v3-base:free", "DeepSeek V3 Base", "DeepSeek", 8000],
      ["moonshotai/kimi-dev-72b:free", "Kimi Dev 72B", "Moonshot AI", 8000],
      [
        "mistralai/mistral-small-3.2-24b-instruct:free",
        "Mistral Small 3.2",
        "Mistral AI",
        8000,
      ],
      ["qwen/qwen3-30b-a3b:free", "Qwen 3 30B A3B", "Alibaba", 8000],
      ["thudm/glm-z1-32b:free", "GLM Z1 32B", "THUDM", 8000],
      [
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "Qwen 2.5 Coder",
        "Alibaba",
        8000,
      ],
      ["meta-llama/llama-4-scout:free", "Llama 4 Scout", "Meta", 8000],
      [
        "deepseek/deepseek-r1-distill-llama-70b:free",
        "DeepSeek R1 Distill",
        "DeepSeek",
        8000,
      ],
      ["meta-llama/llama-3.3-70b-instruct:free", "Llama 3.3 70B", "Meta", 8000],
      ["mistralai/mistral-7b-instruct:free", "Mistral 7B", "Mistral AI", 4000],
      [
        "agentica-org/deepcoder-14b-preview:free",
        "DeepCoder 14B",
        "Agentica",
        4000,
      ],
      ["qwen/qwen-2.5-72b-instruct:free", "Qwen 2.5 72B", "Alibaba", 8000],
      [
        "nvidia/llama-3.3-nemotron-super-49b-v1:free",
        "Nemotron Super 49B",
        "NVIDIA",
        8000,
      ],
      ["meta-llama/llama-3.1-8b-instruct:free", "Llama 3.1 8B", "Meta", 4000],
      [
        "shisa-ai/shisa-v2-llama3.3-70b:free",
        "Shisa V2 Llama 70B",
        "Shisa AI",
        8000,
      ],
      [
        "cognitivecomputations/dolphin3.0-mistral-24b:free",
        "Dolphin 3.0 Mistral",
        "Cognitive",
        8000,
      ],
      [
        "nousresearch/deephermes-3-llama-3-8b-preview:free",
        "DeepHermes 3 8B",
        "Nous Research",
        4000,
      ],
      ["qwen/qwen3-8b:free", "Qwen 3 8B", "Alibaba", 4000],
      ["qwen/qwen2.5-vl-32b-instruct:free", "Qwen 2.5 VL 32B", "Alibaba", 8000],
      ["google/gemma-3-12b-it:free", "Gemma 3 12B", "Google", 4000],
      ["google/gemma-2-9b-it:free", "Gemma 2 9B", "Google", 4000],
      [
        "meta-llama/llama-3.2-11b-vision-instruct:free",
        "Llama 3.2 Vision",
        "Meta",
        4000,
      ],
      ["thudm/glm-4-32b:free", "GLM 4 32B", "THUDM", 8000],
      ["google/gemma-3n-e4b-it:free", "Gemma 3N E4B", "Google", 4000],
      [
        "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
        "Dolphin 3.0 R1",
        "Cognitive",
        8000,
      ],
      [
        "mistralai/mistral-small-24b-instruct-2501:free",
        "Mistral Small 2501",
        "Mistral AI",
        8000,
      ],
      ["rekaai/reka-flash-3:free", "Reka Flash 3", "Reka AI", 4000],
      ["arliai/qwq-32b-arliai-rpr-v1:free", "QwQ 32B ArliAI", "ArliAI", 8000],
      ["meta-llama/llama-3.2-1b-instruct:free", "Llama 3.2 1B", "Meta", 2000],
      ["sarvamai/sarvam-m:free", "Sarvam M", "Sarvam AI", 4000],
      ["google/gemma-3-4b-it:free", "Gemma 3 4B", "Google", 4000],
      ["featherless/qwerky-72b:free", "Qwerky 72B", "Featherless", 8000],
      [
        "moonshotai/kimi-vl-a3b-thinking:free",
        "Kimi VL A3B",
        "Moonshot AI",
        4000,
      ],
      [
        "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
        "Nemotron Ultra 253B",
        "NVIDIA",
        16000,
      ],
    ];

    let modelsAdded = 0;
    for (const [id, name, provider, maxTokens] of models) {
      try {
        await this.run(
          `
          INSERT OR IGNORE INTO models (id, name, provider, max_tokens, cost_per_token, is_active) 
          VALUES (?, ?, ?, ?, 0.0, 1)
        `,
          [id, name, provider, maxTokens]
        );
        modelsAdded++;
      } catch (error) {
        logger.error(`Failed to add model: ${name}`, { error: error.message });
      }
    }

    logger.success(`Database initialized`, {
      models_added: modelsAdded,
      total_models: models.length,
    });
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          logger.error("Database run error", {
            sql: sql.substring(0, 100),
            error: err.message,
          });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error("Database get error", {
            sql: sql.substring(0, 100),
            error: err.message,
          });
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error("Database all error", {
            sql: sql.substring(0, 100),
            error: err.message,
          });
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  close(): void {
    logger.database("Closing database connection");
    this.db.close();
  }
}

export const database = new Database();
