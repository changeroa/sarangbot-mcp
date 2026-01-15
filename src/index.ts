import "dotenv/config";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { connectDB } from "./db/connection.js";
import { logger } from "./utils/logger.js";
import { getAuthMiddleware } from "./middleware/auth.js";
import { config } from "./config/index.js";
import {
  toolSchemas,
  toolDescriptions,
  whoPays,
  pickMenu,
  randomPick,
  rockPaperScissors,
  getGameStats,
  registerCouple,
  addAnniversary,
  getUpcoming,
  suggestAnniversary,
  recommendDate,
  logDate,
  getDateHistory,
} from "./tools/index.js";

// Session store for MCP transports (only used in stateful mode)
const sessions = new Map<string, {
  transport: StreamableHTTPServerTransport;
  createdAt: number;
  lastAccessedAt: number;
}>();

// Session cleanup interval (runs every minute)
const SESSION_TTL = config.sessionTtlMs;
const MAX_SESSIONS = config.maxSessions;

setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [id, entry] of sessions) {
    if (now - entry.lastAccessedAt > SESSION_TTL) {
      entry.transport.close();
      sessions.delete(id);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info({ cleanedCount, activeSessions: sessions.size }, "Session cleanup completed");
  }
}, 60 * 1000);

// Create MCP Server instance
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "sarang-bot",
    version: "1.0.0",
  });

  // Register Game Tools
  server.tool("who_pays", toolDescriptions.who_pays, toolSchemas.who_pays, async (params) => {
    return await whoPays(params as { couple_id: string });
  });

  server.tool("pick_menu", toolDescriptions.pick_menu, toolSchemas.pick_menu, async (params) => {
    return await pickMenu(params as {
      couple_id: string;
      category?: "korean" | "chinese" | "japanese" | "western" | "all";
      exclude?: string[];
    });
  });

  server.tool("random_pick", toolDescriptions.random_pick, toolSchemas.random_pick, async (params) => {
    return await randomPick(params as {
      couple_id: string;
      options: string[];
      description?: string;
    });
  });

  server.tool("rock_paper_scissors", toolDescriptions.rock_paper_scissors, toolSchemas.rock_paper_scissors, async (params) => {
    return await rockPaperScissors(params as {
      couple_id: string;
      player1_choice: "rock" | "paper" | "scissors";
      player2_choice: "rock" | "paper" | "scissors";
    });
  });

  server.tool("get_game_stats", toolDescriptions.get_game_stats, toolSchemas.get_game_stats, async (params) => {
    return await getGameStats(params as { couple_id: string });
  });

  // Register Anniversary Tools
  server.tool("register_couple", toolDescriptions.register_couple, toolSchemas.register_couple, async (params) => {
    return await registerCouple(params as {
      kakao_user_id: string;
      anniversary_date: string;
      partner1_name?: string;
      partner2_name?: string;
    });
  });

  server.tool("add_anniversary", toolDescriptions.add_anniversary, toolSchemas.add_anniversary, async (params) => {
    return await addAnniversary(params as {
      couple_id: string;
      name: string;
      date: string;
      yearly?: boolean;
      reminder_days?: number[];
    });
  });

  server.tool("get_upcoming", toolDescriptions.get_upcoming, toolSchemas.get_upcoming, async (params) => {
    return await getUpcoming(params as {
      couple_id: string;
      days_ahead?: number;
    });
  });

  server.tool("suggest_anniversary", toolDescriptions.suggest_anniversary, toolSchemas.suggest_anniversary, async (params) => {
    return await suggestAnniversary(params as {
      couple_id: string;
      anniversary_type: string;
      budget?: number;
    });
  });

  // Register Date Tools
  server.tool("recommend_date", toolDescriptions.recommend_date, toolSchemas.recommend_date, async (params) => {
    return await recommendDate(params as {
      couple_id: string;
      category?: "restaurant" | "cafe" | "activity" | "all";
      location?: string;
      mood?: "romantic" | "active" | "casual" | "special";
      budget?: number;
    });
  });

  server.tool("log_date", toolDescriptions.log_date, toolSchemas.log_date, async (params) => {
    return await logDate(params as {
      couple_id: string;
      place_name: string;
      category?: string;
      location?: string;
      rating?: number;
      memo?: string;
      photos?: string[];
    });
  });

  server.tool("get_date_history", toolDescriptions.get_date_history, toolSchemas.get_date_history, async (params) => {
    return await getDateHistory(params as {
      couple_id: string;
      limit?: number;
      category?: string;
    });
  });

  return server;
}

// Express app setup
const app = express();

// Health check endpoints (no auth required)
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "sarang-bot"
  });
});

app.get("/health/ready", async (_req: Request, res: Response) => {
  // Check MongoDB connection
  const mongoose = await import("mongoose");
  const isDbConnected = mongoose.default.connection.readyState === 1;

  if (!isDbConnected) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: { database: "disconnected" }
    });
    return;
  }

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: { database: "connected" },
    sessions: sessions.size
  });
});

app.get("/health/live", (_req: Request, res: Response) => {
  res.json({ status: "alive" });
});

// Apply authentication middleware (only for /mcp endpoints)
const authMiddleware = getAuthMiddleware();

// MCP endpoint - handles both GET (SSE) and POST (messages)
app.all("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.header("mcp-session-id");

  if (req.method === "GET") {
    // SSE connection for streaming responses (stateful mode only)
    if (!sessionId) {
      res.status(400).json({ error: "Missing mcp-session-id header" });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();
    await session.transport.handleRequest(req, res);
    return;
  }

  if (req.method === "POST") {
    // Stateless mode: Create new transport for each request
    if (config.mcpStatelessMode || !sessionId) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => `stateless-${Date.now()}`,
      });

      const mcpServer = createMcpServer();
      await mcpServer.connect(transport);

      try {
        await transport.handleRequest(req, res);
      } finally {
        transport.close();
      }
      return;
    }

    // Stateful mode: Reuse existing session or create new one
    let session = sessions.get(sessionId);

    if (session) {
      session.lastAccessedAt = Date.now();
    } else {
      // Check session limit
      if (sessions.size >= MAX_SESSIONS) {
        // Evict oldest session
        let oldest: [string, { lastAccessedAt: number }] | null = null;
        for (const entry of sessions.entries()) {
          if (!oldest || entry[1].lastAccessedAt < oldest[1].lastAccessedAt) {
            oldest = [entry[0], entry[1]];
          }
        }
        if (oldest) {
          const oldSession = sessions.get(oldest[0]);
          oldSession?.transport.close();
          sessions.delete(oldest[0]);
          logger.info({ evictedSessionId: oldest[0] }, "Evicted oldest session due to limit");
        }
      }

      // Create new session
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          sessions.set(newSessionId, {
            transport,
            createdAt: Date.now(),
            lastAccessedAt: Date.now()
          });
          logger.info({ sessionId: newSessionId }, "New session created");
        },
      });

      // Create and connect MCP server
      const mcpServer = createMcpServer();
      await mcpServer.connect(transport);

      // Cleanup on close
      transport.onclose = () => {
        if (sessionId && sessions.has(sessionId)) {
          sessions.delete(sessionId);
          logger.info({ sessionId }, "Session closed");
        }
      };

      session = { transport, createdAt: Date.now(), lastAccessedAt: Date.now() };
    }

    await session.transport.handleRequest(req, res);
    return;
  }

  if (req.method === "DELETE") {
    // Session cleanup
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      session?.transport.close();
      sessions.delete(sessionId);
      logger.info({ sessionId }, "Session deleted by client");
      res.json({ message: "Session closed" });
    } else {
      res.status(404).json({ error: "Session not found" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

// Start server
const PORT = config.port;

async function main() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info("MongoDB connected");

    // Start Express server
    app.listen(PORT, () => {
      logger.info({
        port: PORT,
        environment: config.nodeEnv,
        authType: config.authType,
        statelessMode: config.mcpStatelessMode
      }, "Sarang-Bot MCP Server started");

      console.log(`🚀 Sarang-Bot MCP Server running on port ${PORT}`);
      console.log(`📍 MCP Endpoint: http://localhost:${PORT}/mcp`);
      console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth Type: ${config.authType}`);
      console.log(`📊 Stateless Mode: ${config.mcpStatelessMode}`);
    });
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");

  // Close all sessions
  for (const [id, session] of sessions) {
    session.transport.close();
    sessions.delete(id);
  }

  logger.info("All sessions closed, exiting");
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");

  // Close all sessions
  for (const [id, session] of sessions) {
    session.transport.close();
    sessions.delete(id);
  }

  logger.info("All sessions closed, exiting");
  process.exit(0);
});

main();
