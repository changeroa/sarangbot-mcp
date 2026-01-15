import pino from "pino";

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: "sarang-bot",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  // Redact sensitive information
  redact: {
    paths: [
      "req.headers.authorization",
      "password",
      "token",
      "accessToken",
      "kakaoAccessToken",
      "*.password",
      "*.token"
    ],
    censor: "[REDACTED]"
  },
  // Pretty print in development
  transport: process.env.NODE_ENV === "development"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      }
    : undefined
});

// Request logging helper
export function logRequest(method: string, path: string, statusCode: number, duration: number, extra?: Record<string, unknown>) {
  logger.info({
    method,
    path,
    statusCode,
    duration: `${duration.toFixed(2)}ms`,
    ...extra
  }, "Request completed");
}

// Tool execution logging helper
export function logToolExecution(toolName: string, coupleId: string | undefined, duration: number, success: boolean, extra?: Record<string, unknown>) {
  const log = success ? logger.info : logger.error;
  log({
    tool: toolName,
    coupleId,
    duration: `${duration.toFixed(2)}ms`,
    success,
    ...extra
  }, `Tool ${toolName} ${success ? "succeeded" : "failed"}`);
}

// Error logging helper
export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error({
    context,
    error: errorMessage,
    stack: errorStack,
    ...extra
  }, `Error in ${context}`);
}

export default logger;
