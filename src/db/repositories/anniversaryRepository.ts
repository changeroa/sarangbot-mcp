import { v4 as uuidv4 } from "uuid";
import { AnniversaryModel, type AnniversaryDocument } from "../models/index.js";
import { getNextOccurrence, daysUntil } from "../../utils/dateUtils.js";

export const anniversaryRepository = {
  /**
   * Create a new anniversary
   */
  async create(data: {
    couple_id: string;
    name: string;
    date: Date;
    yearly?: boolean;
  }): Promise<AnniversaryDocument> {
    const anniversary = new AnniversaryModel({
      anniversary_id: uuidv4(),
      couple_id: data.couple_id,
      name: data.name,
      date: data.date,
      yearly: data.yearly ?? true,
    });
    return await anniversary.save();
  },

  /**
   * Find anniversary by id
   */
  async findById(anniversary_id: string): Promise<AnniversaryDocument | null> {
    return await AnniversaryModel.findOne({ anniversary_id });
  },

  /**
   * Find all anniversaries for a couple
   */
  async findByCouple(couple_id: string): Promise<AnniversaryDocument[]> {
    return await AnniversaryModel.find({ couple_id }).sort({ date: 1 });
  },

  /**
   * Get upcoming anniversaries within N days
   */
  async getUpcoming(couple_id: string, daysAhead: number = 90): Promise<Array<{
    anniversary: AnniversaryDocument;
    next_date: Date;
    days_left: number;
  }>> {
    const anniversaries = await this.findByCouple(couple_id);
    const upcoming: Array<{
      anniversary: AnniversaryDocument;
      next_date: Date;
      days_left: number;
    }> = [];

    for (const anniversary of anniversaries) {
      let nextDate: Date;

      if (anniversary.yearly) {
        nextDate = getNextOccurrence(anniversary.date);
      } else {
        nextDate = anniversary.date;
      }

      const daysLeft = daysUntil(nextDate);

      if (daysLeft >= 0 && daysLeft <= daysAhead) {
        upcoming.push({
          anniversary,
          next_date: nextDate,
          days_left: daysLeft,
        });
      }
    }

    // Sort by days left
    return upcoming.sort((a, b) => a.days_left - b.days_left);
  },

  /**
   * Delete anniversary
   */
  async delete(anniversary_id: string): Promise<boolean> {
    const result = await AnniversaryModel.deleteOne({ anniversary_id });
    return result.deletedCount > 0;
  },

  /**
   * Delete all anniversaries for a couple
   */
  async deleteByCouple(couple_id: string): Promise<number> {
    const result = await AnniversaryModel.deleteMany({ couple_id });
    return result.deletedCount;
  },
};
