import { v4 as uuidv4 } from "uuid";
import { GameLogModel, type GameLogDocument } from "../models/index.js";
import type { GameType, GameStats } from "../../types/index.js";

export const gameLogRepository = {
  /**
   * Create a new game log
   */
  async create(data: {
    couple_id: string;
    type: GameType;
    result: {
      winner?: string;
      picked?: string;
      details?: Record<string, unknown>;
    };
  }): Promise<GameLogDocument> {
    const gameLog = new GameLogModel({
      game_log_id: uuidv4(),
      couple_id: data.couple_id,
      type: data.type,
      result: data.result,
      date: new Date(),
    });
    return await gameLog.save();
  },

  /**
   * Get who_pays statistics
   */
  async getWhoPayStats(couple_id: string): Promise<Record<string, number>> {
    const result = await GameLogModel.aggregate([
      { $match: { couple_id, type: "who_pays" } },
      { $group: { _id: "$result.winner", count: { $sum: 1 } } },
    ]);

    const stats: Record<string, number> = {};
    for (const item of result) {
      if (item._id) {
        stats[item._id] = item.count;
      }
    }
    return stats;
  },

  /**
   * Get rock-paper-scissors statistics
   */
  async getRPSStats(couple_id: string, partner1: string, partner2: string): Promise<{
    partner1_wins: number;
    partner2_wins: number;
    draws: number;
  }> {
    const result = await GameLogModel.aggregate([
      { $match: { couple_id, type: "rps" } },
      { $group: { _id: "$result.winner", count: { $sum: 1 } } },
    ]);

    const stats = {
      partner1_wins: 0,
      partner2_wins: 0,
      draws: 0,
    };

    for (const item of result) {
      if (item._id === partner1) {
        stats.partner1_wins = item.count;
      } else if (item._id === partner2) {
        stats.partner2_wins = item.count;
      } else if (item._id === null || item._id === "draw") {
        stats.draws = item.count;
      }
    }

    return stats;
  },

  /**
   * Get all game statistics
   */
  async getAllStats(couple_id: string, partner1: string, partner2: string): Promise<GameStats> {
    const [whoPayStats, rpsStats, totalCount] = await Promise.all([
      this.getWhoPayStats(couple_id),
      this.getRPSStats(couple_id, partner1, partner2),
      GameLogModel.countDocuments({ couple_id }),
    ]);

    return {
      who_pays: whoPayStats,
      rps: rpsStats,
      total_games: totalCount,
    };
  },

  /**
   * Get recent game logs
   */
  async getRecent(couple_id: string, limit: number = 10): Promise<GameLogDocument[]> {
    return await GameLogModel.find({ couple_id })
      .sort({ date: -1 })
      .limit(limit);
  },
};
