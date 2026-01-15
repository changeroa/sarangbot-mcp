import mongoose from "mongoose";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const MONGODB_URI = config.mongoUri || "mongodb://localhost:27017/sarang_bot";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: config.mongoMaxPoolSize,
    });
    logger.info({ uri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") }, "MongoDB connected successfully");
  } catch (error) {
    logger.error({ error }, "MongoDB connection error");
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  } catch (error) {
    logger.error({ error }, "MongoDB disconnection error");
  }
}

// Handle connection events
mongoose.connection.on("error", (err) => {
  logger.error({ error: err }, "MongoDB error");
});

mongoose.connection.on("disconnected", () => {
  logger.info("MongoDB disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});
