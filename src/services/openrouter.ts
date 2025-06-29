import axios from "axios";
import { OPENROUTER_API_KEY } from "../config/constants.js";
import { OpenRouterResponse, User } from "../types/bot.js";
import { modelService } from "./model.js";
import { logger } from "../utils/logger.js";

export const openRouterService = {
  async generateResponse(
    prompt: string,
    modelId: string,
    userId: number,
    user?: User
  ): Promise<OpenRouterResponse> {
    const model = await modelService.getModel(modelId);
    if (!model) {
      logger.error("Model not found", { model_id: modelId, user_id: userId });
      throw new Error("Model topilmadi");
    }

    try {
      // System message yaratish
      let systemMessage =
        "Siz foydali AI yordamchisiz. O'zbek tilida javob bering.";

      if (user?.age || user?.interests || user?.first_name) {
        systemMessage += "\n\nFoydalanuvchi haqida ma'lumot:";
        if (user.first_name) {
          systemMessage += `\n- Ismi: ${user.first_name}`;
        }
        if (user.age) {
          systemMessage += `\n- Yoshi: ${user.age}`;
        }
        if (user.interests) {
          systemMessage += `\n- Qiziqishlari: ${user.interests}`;
        }
        systemMessage +=
          "\n\nBu ma'lumotlardan foydalanib, foydalanuvchiga shaxsiylashtirilgan va mos javob bering.";
      }

      logger.ai("Sending request to OpenRouter", {
        model: model.name,
        user_id: userId,
        prompt_length: prompt.length,
        max_tokens: Math.min(model.max_tokens, 1000),
      });

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: modelId,
          messages: [
            {
              role: "system",
              content: systemMessage,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: Math.min(model.max_tokens, 1000),
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "X-Title": "Telegram AI Bot",
            "HTTP-Referer": "https://t.me/abbi_ai_bot",
          },
        }
      );

      const completion = response.data.choices[0].message.content;
      const tokens = response.data.usage?.total_tokens || 100;

      logger.success("OpenRouter response received", {
        user_id: userId,
        tokens,
        response_length: completion.length,
      });

      return {
        text: completion,
        tokens: tokens,
      };
    } catch (error: any) {
      logger.error("OpenRouter API Error", {
        error: error.response?.data || error.message,
        model_id: modelId,
        user_id: userId,
      });
      throw new Error("AI xizmati vaqtincha ishlamayapti");
    }
  },
};
