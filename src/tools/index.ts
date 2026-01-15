import { z } from "zod";

// Game Tools
export { whoPays } from "./game/whoPays.js";
export { pickMenu } from "./game/pickMenu.js";
export { randomPick } from "./game/randomPick.js";
export { rockPaperScissors } from "./game/rockPaperScissors.js";
export { getGameStats } from "./game/getGameStats.js";

// Anniversary Tools
export { registerCouple } from "./anniversary/registerCouple.js";
export { addAnniversary } from "./anniversary/addAnniversary.js";
export { getUpcoming } from "./anniversary/getUpcoming.js";
export { suggestAnniversary } from "./anniversary/suggestAnniversary.js";

// Date Tools
export { recommendDate } from "./date/recommendDate.js";
export { logDate } from "./date/logDate.js";
export { getDateHistory } from "./date/getDateHistory.js";

// Tool Schemas for MCP Registration (English for token efficiency)
export const toolSchemas = {
  // ==================== Game Tools ====================
  who_pays: {
    couple_id: z.string().describe("Unique couple identifier (UUID)"),
  },
  pick_menu: {
    couple_id: z.string().describe("Unique couple identifier"),
    category: z.enum(["korean", "chinese", "japanese", "western", "all"])
      .optional()
      .describe("Food category filter (korean, chinese, japanese, western, or all)"),
    exclude: z.array(z.string())
      .optional()
      .describe("List of menu items to exclude from selection"),
  },
  random_pick: {
    couple_id: z.string().describe("Unique couple identifier"),
    options: z.array(z.string())
      .min(2)
      .describe("List of options to choose from (minimum 2 items)"),
    description: z.string()
      .optional()
      .describe("Description of what is being chosen (e.g., 'movie for tonight')"),
  },
  rock_paper_scissors: {
    couple_id: z.string().describe("Unique couple identifier"),
    player1_choice: z.enum(["rock", "paper", "scissors"])
      .describe("Partner 1's choice (rock, paper, or scissors)"),
    player2_choice: z.enum(["rock", "paper", "scissors"])
      .describe("Partner 2's choice (rock, paper, or scissors)"),
  },
  get_game_stats: {
    couple_id: z.string().describe("Unique couple identifier"),
  },

  // ==================== Anniversary Tools ====================
  register_couple: {
    kakao_user_id: z.string().describe("Kakao user ID for authentication"),
    anniversary_date: z.string().describe("Relationship start date in YYYY-MM-DD format"),
    partner1_name: z.string()
      .optional()
      .describe("First partner's name or nickname"),
    partner2_name: z.string()
      .optional()
      .describe("Second partner's name or nickname"),
  },
  add_anniversary: {
    couple_id: z.string().describe("Unique couple identifier"),
    name: z.string().describe("Name of the anniversary (e.g., 'First Date', 'Birthday')"),
    date: z.string().describe("Anniversary date in YYYY-MM-DD format"),
    yearly: z.boolean()
      .optional()
      .describe("Whether this anniversary repeats yearly (default: true)"),
    reminder_days: z.array(z.number())
      .optional()
      .describe("Days before anniversary to send reminders (e.g., [7, 3, 1])"),
  },
  get_upcoming: {
    couple_id: z.string().describe("Unique couple identifier"),
    days_ahead: z.number()
      .optional()
      .describe("Number of days to look ahead (default: 90)"),
  },
  suggest_anniversary: {
    couple_id: z.string().describe("Unique couple identifier"),
    anniversary_type: z.string().describe("Type of anniversary (e.g., '100days', '1year', 'birthday')"),
    budget: z.number()
      .optional()
      .describe("Budget in Korean Won for gift/activity suggestions"),
  },

  // ==================== Date Tools ====================
  recommend_date: {
    couple_id: z.string().describe("Unique couple identifier"),
    category: z.enum(["restaurant", "cafe", "activity", "all"])
      .optional()
      .describe("Type of date spot (restaurant, cafe, activity, or all)"),
    location: z.string()
      .optional()
      .describe("Location or area name (e.g., 'Gangnam', 'Hongdae')"),
    mood: z.enum(["romantic", "active", "casual", "special"])
      .optional()
      .describe("Desired mood for the date"),
    budget: z.number()
      .optional()
      .describe("Budget per person in Korean Won"),
  },
  log_date: {
    couple_id: z.string().describe("Unique couple identifier"),
    place_name: z.string().describe("Name of the visited place"),
    category: z.string()
      .optional()
      .describe("Category of the place (e.g., 'restaurant', 'cafe')"),
    location: z.string()
      .optional()
      .describe("Location or area where the place is"),
    rating: z.number()
      .min(1)
      .max(5)
      .optional()
      .describe("Rating from 1 to 5 stars"),
    memo: z.string()
      .optional()
      .describe("Notes or review about the date"),
    photos: z.array(z.string())
      .optional()
      .describe("List of photo URLs from the date"),
  },
  get_date_history: {
    couple_id: z.string().describe("Unique couple identifier"),
    limit: z.number()
      .optional()
      .describe("Maximum number of records to retrieve (default: 10)"),
    category: z.string()
      .optional()
      .describe("Filter by place category"),
  },
};

// Tool descriptions (English for token efficiency and AI comprehension)
export const toolDescriptions = {
  who_pays: "Randomly decides who pays for the meal today. Shows payment history statistics for fairness tracking.",
  pick_menu: "Randomly selects a food menu. Supports filtering by cuisine category and excluding specific items.",
  random_pick: "Randomly selects one item from a list of options. Useful for deciding date spots, movies, activities, etc.",
  rock_paper_scissors: "Play rock-paper-scissors between partners. Records game history and shows win statistics.",
  get_game_stats: "Shows comprehensive game statistics for the couple including payment counts and RPS records.",
  register_couple: "Register a new couple in the system. Required before using other tools. Links Kakao account.",
  add_anniversary: "Add a custom anniversary date. Supports birthdays, first meeting, proposal day, etc. with reminders.",
  get_upcoming: "Shows upcoming anniversaries and milestone D-days (100 days, 1 year, etc.) within specified days.",
  suggest_anniversary: "Suggests gift ideas, date spots, and activities for anniversaries based on type and budget.",
  recommend_date: "Recommends date spots using Kakao Map API. Provides real location data with ratings and details.",
  log_date: "Saves a date memory with location, rating, notes, and photos for future reference.",
  get_date_history: "Retrieves past date history with filtering options. Shows visited places, ratings, and notes.",
};
