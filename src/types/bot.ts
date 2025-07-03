import { Context } from "telegraf";

export interface BotContext extends Context {
  session?: {
    step?: string;
    data?: any;
  };
}

export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  age?: number;
  interests?: string;
  daily_tokens: number;
  total_tokens: number;
  daily_used: number;
  total_used: number;
  selected_model: string;
  is_active: boolean;
  registration_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  max_tokens: number;
  cost_per_token: number;
  is_active: boolean;
  created_at: string;
}

export interface Stats {
  user_id: number;
  daily_requests: number;
  daily_tokens: number;
  total_requests: number;
  total_tokens: number;
  created_at: string;
}

export interface OpenRouterResponse {
  text: string;
  tokens: number;
}

export interface Promocode {
  id: number;
  code: string;
  daily_tokens: number;
  total_tokens: number;
  max_usage: number;
  current_usage: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
}
