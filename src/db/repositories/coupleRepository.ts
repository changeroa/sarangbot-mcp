import { v4 as uuidv4 } from "uuid";
import { CoupleModel, type CoupleDocument } from "../models/index.js";
import type { Couple } from "../../types/index.js";

export const coupleRepository = {
  /**
   * Create a new couple
   */
  async create(data: {
    kakao_user_id: string;
    anniversary_date: Date;
    partner1_name?: string;
    partner2_name?: string;
  }): Promise<CoupleDocument> {
    const couple = new CoupleModel({
      couple_id: uuidv4(),
      kakao_user_ids: [data.kakao_user_id],
      partner1_name: data.partner1_name || "Partner 1",
      partner2_name: data.partner2_name || "Partner 2",
      anniversary_date: data.anniversary_date,
    });
    return await couple.save();
  },

  /**
   * Find couple by couple_id
   */
  async findById(couple_id: string): Promise<CoupleDocument | null> {
    return await CoupleModel.findOne({ couple_id });
  },

  /**
   * Find couple by kakao user id
   */
  async findByKakaoUserId(kakao_user_id: string): Promise<CoupleDocument | null> {
    return await CoupleModel.findOne({ kakao_user_ids: kakao_user_id });
  },

  /**
   * Update couple
   */
  async update(couple_id: string, data: Partial<Couple>): Promise<CoupleDocument | null> {
    return await CoupleModel.findOneAndUpdate(
      { couple_id },
      { $set: data },
      { new: true }
    );
  },

  /**
   * Add partner to couple
   */
  async addPartner(couple_id: string, kakao_user_id: string): Promise<CoupleDocument | null> {
    return await CoupleModel.findOneAndUpdate(
      { couple_id },
      { $addToSet: { kakao_user_ids: kakao_user_id } },
      { new: true }
    );
  },

  /**
   * Delete couple
   */
  async delete(couple_id: string): Promise<boolean> {
    const result = await CoupleModel.deleteOne({ couple_id });
    return result.deletedCount > 0;
  },
};
