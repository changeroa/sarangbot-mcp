import { z } from "zod";

// Configuration schema with validation
const configSchema = z.object({
  // Server
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  port: z.coerce.number().default(3000),

  // Database
  mongoUri: z.string().url().optional(),
  mongoMaxPoolSize: z.coerce.number().default(10),

  // External APIs
  kakaoApiKey: z.string().optional(),

  // Authentication
  authType: z.enum(["oauth", "key_token", "none"]).default("oauth"),
  skipAuth: z.coerce.boolean().default(false),

  // MCP Settings
  mcpStatelessMode: z.coerce.boolean().default(false),

  // Session Settings
  sessionTtlMs: z.coerce.number().default(30 * 60 * 1000), // 30 minutes
  maxSessions: z.coerce.number().default(10000),

  // Response Settings
  maxResponseSize: z.coerce.number().default(50 * 1024), // 50KB

  // Logging
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    mongoUri: process.env.MONGODB_URI,
    mongoMaxPoolSize: process.env.MONGO_MAX_POOL_SIZE,
    kakaoApiKey: process.env.KAKAO_REST_API_KEY,
    authType: process.env.AUTH_TYPE,
    skipAuth: process.env.SKIP_AUTH,
    mcpStatelessMode: process.env.MCP_STATELESS_MODE,
    sessionTtlMs: process.env.SESSION_TTL_MS,
    maxSessions: process.env.MAX_SESSIONS,
    maxResponseSize: process.env.MAX_RESPONSE_SIZE,
    logLevel: process.env.LOG_LEVEL,
  });

  if (!result.success) {
    console.error("Configuration validation failed:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

export default config;
