import mongoose, { Schema, Document } from "mongoose";
import type { Anniversary } from "../../types/index.js";

export interface AnniversaryDocument extends Omit<Anniversary, "_id">, Document {}

const AnniversarySchema = new Schema<AnniversaryDocument>(
  {
    anniversary_id: {
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
    name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    yearly: {
      type: Boolean,
      default: true,
    },
    reminder_days: {
      type: [Number],
      default: [14, 7, 3, 1],
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
    },
  }
);

// Compound index for couple's anniversaries
AnniversarySchema.index({ couple_id: 1, date: 1 });

export const AnniversaryModel = mongoose.model<AnniversaryDocument>("Anniversary", AnniversarySchema);
