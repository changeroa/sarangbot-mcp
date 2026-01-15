import "dotenv/config";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { connectDB } from "./db/connection.js";
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

// Session store for MCP transports
const sessions = new Map<string, StreamableHTTPServerTransport>();

// Create MCP Server instance
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "couple-mcp",
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

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// MCP endpoint - handles both GET (SSE) and POST (messages)
app.all("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.header("mcp-session-id");

  if (req.method === "GET") {
    // SSE connection for streaming responses
    if (!sessionId) {
      res.status(400).json({ error: "Missing mcp-session-id header" });
      return;
    }

    const transport = sessions.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await transport.handleRequest(req, res);
    return;
  }

  if (req.method === "POST") {
    // New session or existing session message
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId)!;
    } else {
      // Create new session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          sessions.set(newSessionId, transport);
          console.log(`New session created: ${newSessionId}`);
        },
      });

      // Create and connect MCP server
      const mcpServer = createMcpServer();
      await mcpServer.connect(transport);

      // Cleanup on close
      transport.onclose = () => {
        if (sessionId) {
          sessions.delete(sessionId);
          console.log(`Session closed: ${sessionId}`);
        }
      };
    }

    await transport.handleRequest(req, res);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

// Session cleanup on DELETE
app.delete("/mcp", (req: Request, res: Response) => {
  const sessionId = req.header("mcp-session-id");
  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId);
    transport?.close();
    sessions.delete(sessionId);
    res.json({ message: "Session closed" });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

async function main() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ MongoDB connected");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Couple MCP Server running on port ${PORT}`);
      console.log(`📍 MCP Endpoint: http://localhost:${PORT}/mcp`);
      console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
