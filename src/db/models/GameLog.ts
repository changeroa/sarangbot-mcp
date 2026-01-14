import mongoose, { Schema, Document } from "mongoose";
import type { GameLog, GameType } from "../../types/index.js";

export interface GameLogDocument extends Omit<GameLog, "_id">, Document {}

const GameLogSchema = new Schema<GameLogDocument>(
  {
    game_log_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    couple_id: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["who_pays", "rps", "menu", "random"] as GameType[],
    },
    result: {
      winner: String,
      picked: String,
      details: Schema.Types.Mixed,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
    },
  }
);

// Compound index for game stats queries
GameLogSchema.index({ couple_id: 1, type: 1, date: -1 });

export const GameLogModel = mongoose.model<GameLogDocument>("GameLog", GameLogSchema);
