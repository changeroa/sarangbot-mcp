import mongoose, { Schema, Document } from "mongoose";
import type { DateLog } from "../../types/index.js";

export interface DateLogDocument extends Omit<DateLog, "_id">, Document {}

const DateLogSchema = new Schema<DateLogDocument>(
  {
    date_log_id: {
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
    place: {
      type: String,
      required: true,
    },
    memo: {
      type: String,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    metadata: {
      location: String,
      category: String,
      photos: [String],
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
    },
  }
);

// Compound index for couple's date logs
DateLogSchema.index({ couple_id: 1, date: -1 });

export const DateLogModel = mongoose.model<DateLogDocument>("DateLog", DateLogSchema);
