import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { logger } from "../utils/logger.js";
import { coupleRepository } from "../db/repositories/index.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      coupleId?: string;
      kakaoAccessToken?: string;
    }
  }
}

interface KakaoTokenInfo {
  id: number;
  expires_in: number;
  app_id: number;
}

/**
 * Validate Kakao Access Token
 * PlayMCP acts as OAuth Client and passes the access token to this server
 */
async function validateKakaoAccessToken(accessToken: string): Promise<{ userId: string; expiresIn: number }> {
  const response = await axios.get<KakaoTokenInfo>(
    "https://kapi.kakao.com/v1/user/access_token_info",
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  return {
    userId: response.data.id.toString(),
    expiresIn: response.data.expires_in
  };
}

/**
 * OAuth Authentication Middleware for PlayMCP
 * Validates Kakao access token passed in Authorization header
 */
export async function oauthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip auth for health check
  if (req.path === "/health" || req.path === "/health/ready" || req.path === "/health/live") {
    next();
    return;
  }

  // Skip auth in development mode if configured
  if (process.env.NODE_ENV === "development" && process.env.SKIP_AUTH === "true") {
    logger.warn("Auth skipped in development mode");
    next();
    return;
  }

  const authHeader = req.header("Authorization");

  if (!authHeader) {
    logger.warn({ path: req.path }, "Missing Authorization header");
    res.status(401).json({
      error: "Authentication required",
      code: "AUTH_REQUIRED",
      message: "Please provide a valid Kakao access token"
    });
    return;
  }

  // Extract Bearer token
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({
      error: "Invalid Authorization header format",
      code: "INVALID_AUTH_FORMAT",
      message: "Expected format: Bearer <access_token>"
    });
    return;
  }

  try {
    // Validate Kakao access token
    const { userId, expiresIn } = await validateKakaoAccessToken(token);

    // Check if token is about to expire (less than 5 minutes)
    if (expiresIn < 300) {
      logger.warn({ userId, expiresIn }, "Access token expiring soon");
    }

    // Store user info in request
    req.userId = userId;
    req.kakaoAccessToken = token;

    // Try to find associated couple
    const couple = await coupleRepository.findByKakaoUserId(userId);
    if (couple) {
      req.coupleId = couple.couple_id;
    }

    logger.info({
      userId,
      coupleId: req.coupleId,
      expiresIn
    }, "User authenticated");

    next();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        logger.warn("Invalid or expired Kakao token");
        res.status(401).json({
          error: "Invalid or expired token",
          code: "INVALID_TOKEN",
          message: "The access token is invalid or has expired"
        });
        return;
      }

      logger.error({
        status,
        message: error.message
      }, "Kakao API error");
    } else {
      logger.error({ error }, "Authentication error");
    }

    res.status(500).json({
      error: "Authentication failed",
      code: "AUTH_FAILED",
      message: "Failed to validate authentication token"
    });
  }
}

/**
 * Optional: Key/Token based authentication (simpler alternative)
 * Uses custom header X-Sarang-Bot-Token
 */
export async function keyTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip auth for health check
  if (req.path === "/health" || req.path === "/health/ready" || req.path === "/health/live") {
    next();
    return;
  }

  const token = req.header("X-Sarang-Bot-Token");

  if (!token) {
    res.status(401).json({
      error: "Authentication required",
      code: "AUTH_REQUIRED",
      message: "Please provide X-Sarang-Bot-Token header"
    });
    return;
  }

  // Validate token format (expecting: userId:coupleId or just userId)
  try {
    const [userId, coupleId] = token.split(":");

    if (!userId) {
      throw new Error("Invalid token format");
    }

    req.userId = userId;
    if (coupleId) {
      req.coupleId = coupleId;
    } else {
      // Try to find couple by userId
      const couple = await coupleRepository.findByKakaoUserId(userId);
      if (couple) {
        req.coupleId = couple.couple_id;
      }
    }

    logger.info({
      userId,
      coupleId: req.coupleId
    }, "User authenticated via key/token");

    next();
  } catch (error) {
    logger.warn({ error }, "Invalid token format");
    res.status(401).json({
      error: "Invalid token",
      code: "INVALID_TOKEN",
      message: "Token format should be: userId or userId:coupleId"
    });
  }
}

/**
 * Get the appropriate auth middleware based on configuration
 */
export function getAuthMiddleware() {
  const authType = process.env.AUTH_TYPE || "oauth";

  if (authType === "key_token") {
    logger.info("Using Key/Token authentication");
    return keyTokenMiddleware;
  }

  logger.info("Using OAuth (Kakao) authentication");
  return oauthMiddleware;
}
