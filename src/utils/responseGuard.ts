import { logger } from "./logger.js";
import type { ToolResponse } from "../types/index.js";

// Maximum response size (50KB as recommended by PlayMCP)
const MAX_RESPONSE_SIZE = 50 * 1024;

/**
 * Guard response size to prevent PlayMCP errors
 * Truncates response if it exceeds the limit
 */
export function guardResponseSize(response: ToolResponse): ToolResponse {
  const text = response.content[0]?.text || "";

  if (text.length > MAX_RESPONSE_SIZE) {
    logger.warn({
      originalSize: text.length,
      limit: MAX_RESPONSE_SIZE,
      truncatedBy: text.length - MAX_RESPONSE_SIZE
    }, "Response truncated due to size limit");

    return {
      content: [{
        type: "text",
        text: text.slice(0, MAX_RESPONSE_SIZE - 100) +
          "\n\n---\n⚠️ *Response truncated due to size limits*"
      }]
    };
  }

  return response;
}

/**
 * Format data as YAML-like string for AI readability
 */
export function formatAsYaml(data: Record<string, unknown>, indent: number = 0): string {
  const spaces = "  ".repeat(indent);
  let result = "";

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result += `${spaces}${key}: null\n`;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      result += formatAsYaml(value as Record<string, unknown>, indent + 1);
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      value.forEach(item => {
        if (typeof item === "object") {
          result += `${spaces}  -\n`;
          result += formatAsYaml(item as Record<string, unknown>, indent + 2);
        } else {
          result += `${spaces}  - ${item}\n`;
        }
      });
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }

  return result;
}

/**
 * Format data as Markdown table
 */
export function formatAsTable(data: Record<string, string | number>): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return "*No data*\n";

  let table = "| Key | Value |\n";
  table += "|-----|-------|\n";

  for (const [key, value] of entries) {
    table += `| ${key} | ${value} |\n`;
  }

  return table;
}

/**
 * Standard tool response formatter
 * Creates consistent, AI-readable responses
 */
export function formatToolResponse(data: {
  title: string;
  result?: Record<string, unknown>;
  stats?: Record<string, string | number>;
  list?: Array<Record<string, unknown>>;
  suggestions?: string[];
  error?: string;
}): ToolResponse {
  let markdown = `## ${data.title}\n\n`;

  // Error section
  if (data.error) {
    markdown += `### ❌ Error\n${data.error}\n\n`;
    return guardResponseSize({
      content: [{ type: "text", text: markdown }]
    });
  }

  // Result section
  if (data.result) {
    markdown += "### Result\n```yaml\n";
    markdown += formatAsYaml(data.result);
    markdown += "```\n\n";
  }

  // List section
  if (data.list && data.list.length > 0) {
    markdown += "### Items\n";
    data.list.forEach((item, index) => {
      markdown += `#### ${index + 1}.\n`;
      markdown += "```yaml\n";
      markdown += formatAsYaml(item);
      markdown += "```\n";
    });
    markdown += "\n";
  }

  // Statistics section
  if (data.stats && Object.keys(data.stats).length > 0) {
    markdown += "### Statistics\n";
    markdown += formatAsTable(data.stats);
    markdown += "\n";
  }

  // Suggestions section
  if (data.suggestions && data.suggestions.length > 0) {
    markdown += "### Suggestions\n";
    data.suggestions.forEach(s => {
      markdown += `- ${s}\n`;
    });
    markdown += "\n";
  }

  return guardResponseSize({
    content: [{ type: "text", text: markdown }]
  });
}

/**
 * Create error response
 */
export function createErrorResponse(message: string, suggestion?: string): ToolResponse {
  let text = `❌ **Error**: ${message}`;

  if (suggestion) {
    text += `\n\n💡 **Suggestion**: ${suggestion}`;
  }

  return {
    content: [{ type: "text", text }]
  };
}

/**
 * Create success response with simple message
 */
export function createSuccessResponse(message: string): ToolResponse {
  return {
    content: [{ type: "text", text: `✅ ${message}` }]
  };
}
