import { database } from "../config/database.js";
import { Model } from "../types/bot.js";

export const modelService = {
  async getActiveModels(): Promise<Model[]> {
    return await database.all(
      "SELECT * FROM models WHERE is_active = 1 ORDER BY name"
    );
  },

  async getAllModels(): Promise<Model[]> {
    return await database.all("SELECT * FROM models ORDER BY name");
  },

  async getModel(id: string): Promise<Model | null> {
    return await database.get("SELECT * FROM models WHERE id = ?", [id]);
  },

  async createModel(model: Omit<Model, "created_at">): Promise<Model> {
    await database.run(
      `
      INSERT INTO models (id, name, provider, max_tokens, cost_per_token, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        model.id,
        model.name,
        model.provider,
        model.max_tokens,
        model.cost_per_token,
        model.is_active ? 1 : 0,
      ]
    );

    return await database.get("SELECT * FROM models WHERE id = ?", [model.id]);
  },

  async updateModel(id: string, updates: Partial<Model>): Promise<void> {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    values.push(id);

    await database.run(`UPDATE models SET ${fields} WHERE id = ?`, values);
  },

  async deleteModel(id: string): Promise<void> {
    await database.run("DELETE FROM models WHERE id = ?", [id]);
  },
};
