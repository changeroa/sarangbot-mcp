// Couple Types
export interface Couple {
  _id?: string;
  couple_id: string;
  kakao_user_ids: string[];
  partner1_name: string;
  partner2_name: string;
  anniversary_date: Date;
  created_at: Date;
  updated_at: Date;
  settings: {
    timezone: string;
    language: string;
  };
}

// Anniversary Types
export interface Anniversary {
  _id?: string;
  anniversary_id: string;
  couple_id: string;
  name: string;
  date: Date;
  yearly: boolean;
  reminder_days: number[];
  created_at: Date;
}

// Date Log Types
export interface DateLog {
  _id?: string;
  date_log_id: string;
  couple_id: string;
  place: string;
  memo?: string;
  rating?: number;
  date: Date;
  created_at: Date;
  metadata?: {
    location?: string;
    category?: string;
    photos?: string[];
  };
}

// Game Log Types
export type GameType = "who_pays" | "rps" | "menu" | "random";

export interface GameLog {
  _id?: string;
  game_log_id: string;
  couple_id: string;
  type: GameType;
  result: {
    winner?: string;
    picked?: string;
    details?: Record<string, unknown>;
  };
  date: Date;
  created_at: Date;
}

// Kakao Map Types
export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  road_address: string;
  phone: string;
  url: string;
  x: string;
  y: string;
}

// Tool Response Types (compatible with MCP SDK)
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{
    type: "text";
    text: string;
  }>;
}

// Game Stats Types
export interface GameStats {
  who_pays: Record<string, number>;
  rps: {
    partner1_wins: number;
    partner2_wins: number;
    draws: number;
  };
  total_games: number;
}
