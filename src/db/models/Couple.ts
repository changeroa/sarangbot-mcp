import mongoose, { Schema, Document } from "mongoose";
import type { Couple } from "../../types/index.js";

export interface CoupleDocument extends Omit<Couple, "_id">, Document {}

const CoupleSchema = new Schema<CoupleDocument>(
  {
    couple_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    kakao_user_ids: {
      type: [String],
      required: true,
      index: true,
    },
    partner1_name: {
      type: String,
      required: true,
      default: "Partner 1",
    },
    partner2_name: {
      type: String,
      required: true,
      default: "Partner 2",
    },
    anniversary_date: {
      type: Date,
      required: true,
      index: true,
    },
    settings: {
      timezone: {
        type: String,
        default: "Asia/Seoul",
      },
      language: {
        type: String,
        default: "ko",
      },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

export const CoupleModel = mongoose.model<CoupleDocument>("Couple", CoupleSchema);
