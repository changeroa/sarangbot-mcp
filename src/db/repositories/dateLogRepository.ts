import { v4 as uuidv4 } from "uuid";
import { DateLogModel, type DateLogDocument } from "../models/index.js";

interface CreateDateLogData {
  couple_id: string;
  place_name: string;
  category?: string;
  location?: string;
  rating?: number;
  memo?: string;
  photos?: string[];
  visited_at?: Date;
}

export const dateLogRepository = {
  /**
   * Create a new date log
   */
  async create(data: CreateDateLogData): Promise<DateLogDocument> {
    const dateLog = new DateLogModel({
      date_log_id: uuidv4(),
      couple_id: data.couple_id,
      place: data.place_name,
      memo: data.memo,
      rating: data.rating,
      date: data.visited_at || new Date(),
      metadata: {
        location: data.location,
        category: data.category,
        photos: data.photos || [],
      },
    });
    return await dateLog.save();
  },

  /**
   * Find date log by id
   */
  async findById(date_log_id: string): Promise<DateLogDocument | null> {
    return await DateLogModel.findOne({ date_log_id });
  },

  /**
   * Get date history for a couple
   */
  async getHistory(
    couple_id: string,
    limit: number = 10,
    category?: string
  ): Promise<Array<{
    place_name: string;
    category: string;
    location?: string;
    rating?: number;
    memo?: string;
    photos: string[];
    visited_at: Date;
  }>> {
    const query: Record<string, unknown> = { couple_id };
    if (category) {
      query["metadata.category"] = category;
    }

    const logs = await DateLogModel.find(query)
      .sort({ date: -1 })
      .limit(limit);

    return logs.map(log => ({
      place_name: log.place,
      category: log.metadata?.category || "기타",
      location: log.metadata?.location,
      rating: log.rating,
      memo: log.memo,
      photos: log.metadata?.photos || [],
      visited_at: log.date,
    }));
  },

  /**
   * Get recent date logs for a couple
   */
  async getRecent(couple_id: string, limit: number = 10): Promise<DateLogDocument[]> {
    return await DateLogModel.find({ couple_id })
      .sort({ date: -1 })
      .limit(limit);
  },

  /**
   * Get date logs by date range
   */
  async getByDateRange(
    couple_id: string,
    startDate: Date,
    endDate: Date
  ): Promise<DateLogDocument[]> {
    return await DateLogModel.find({
      couple_id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });
  },

  /**
   * Get total count for a couple
   */
  async getCount(couple_id: string): Promise<number> {
    return await DateLogModel.countDocuments({ couple_id });
  },

  /**
   * Get visited places for a couple
   */
  async getVisitedPlaces(couple_id: string): Promise<string[]> {
    const logs = await DateLogModel.find({ couple_id }).select("place");
    return logs.map((log) => log.place);
  },

  /**
   * Delete date log
   */
  async delete(date_log_id: string): Promise<boolean> {
    const result = await DateLogModel.deleteOne({ date_log_id });
    return result.deletedCount > 0;
  },
};
