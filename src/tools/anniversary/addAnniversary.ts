import { coupleRepository, anniversaryRepository } from "../../db/repositories/index.js";
import { parseDate, formatDate, daysUntil, getNextOccurrence } from "../../utils/dateUtils.js";
import type { ToolResponse } from "../../types/index.js";

interface AddAnniversaryParams {
  couple_id: string;
  name: string;
  date: string;
  yearly?: boolean;
}

export async function addAnniversary({
  couple_id,
  name,
  date,
  yearly = true
}: AddAnniversaryParams): Promise<ToolResponse> {
  // Find couple
  const couple = await coupleRepository.findById(couple_id);
  if (!couple) {
    return {
      content: [{
        type: "text",
        text: "❌ **Error**: Couple not found. Please register first using `register_couple`."
      }]
    };
  }

  // Parse and validate date
  let parsedDate: Date;
  try {
    parsedDate = parseDate(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Invalid date");
    }
  } catch {
    return {
      content: [{
        type: "text",
        text: "❌ **Error**: Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-06-15)."
      }]
    };
  }

  // Create anniversary
  const anniversary = await anniversaryRepository.create({
    couple_id,
    name,
    date: parsedDate,
    yearly
  });

  // Calculate next occurrence
  const nextDate = yearly ? getNextOccurrence(parsedDate) : parsedDate;
  const daysLeft = daysUntil(nextDate);

  const yearlyText = yearly ? "📅 Repeats yearly" : "📌 One-time event";

  const response = `## 🎉 Anniversary Added!

- **Name**: ${name}
- **Date**: ${formatDate(parsedDate)}
- **ID**: \`${anniversary.anniversary_id}\`
- ${yearlyText}

---

### ⏰ Next Occurrence
- **Date**: ${formatDate(nextDate)}
- **Days Left**: ${daysLeft} days

---

*You'll be reminded before this anniversary!*`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
