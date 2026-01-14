import { coupleRepository } from "../../db/repositories/index.js";
import { calculateDDay, parseDate, formatDate } from "../../utils/dateUtils.js";
import type { ToolResponse } from "../../types/index.js";

interface RegisterCoupleParams {
  kakao_user_id: string;
  anniversary_date: string;
  partner1_name?: string;
  partner2_name?: string;
}

export async function registerCouple({
  kakao_user_id,
  anniversary_date,
  partner1_name,
  partner2_name
}: RegisterCoupleParams): Promise<ToolResponse> {
  // Check if user already has a couple
  const existingCouple = await coupleRepository.findByKakaoUserId(kakao_user_id);
  if (existingCouple) {
    const dDay = calculateDDay(existingCouple.anniversary_date);
    return {
      content: [{
        type: "text",
        text: `## ℹ️ Already Registered

You are already part of a couple!

- **Couple ID**: \`${existingCouple.couple_id}\`
- **Partners**: ${existingCouple.partner1_name} & ${existingCouple.partner2_name}
- **Anniversary**: ${formatDate(existingCouple.anniversary_date)}
- **D+Day**: ${dDay}

Use this couple_id for other tools.`
      }]
    };
  }

  // Parse and validate date
  let parsedDate: Date;
  try {
    parsedDate = parseDate(anniversary_date);
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

  // Check if date is in the future
  if (parsedDate > new Date()) {
    return {
      content: [{
        type: "text",
        text: "❌ **Error**: Anniversary date cannot be in the future."
      }]
    };
  }

  // Create couple
  const couple = await coupleRepository.create({
    kakao_user_id,
    anniversary_date: parsedDate,
    partner1_name: partner1_name || "Partner 1",
    partner2_name: partner2_name || "Partner 2"
  });

  const dDay = calculateDDay(parsedDate);

  // Calculate milestones
  const milestones = [
    { name: "100 Days", days: 100 },
    { name: "200 Days", days: 200 },
    { name: "300 Days", days: 300 },
    { name: "1 Year", days: 365 },
  ];

  const upcomingMilestones = milestones
    .filter(m => m.days > dDay)
    .slice(0, 3)
    .map(m => `- ${m.name}: ${m.days - dDay} days left`)
    .join("\n");

  const response = `## 💑 Couple Registered!

- **Couple ID**: \`${couple.couple_id}\`
- **Anniversary**: ${formatDate(parsedDate)}
- **Today's D+Day**: **${dDay}**
- **Partners**: ${couple.partner1_name} & ${couple.partner2_name}

Welcome to Couple MCP! 💕

---

### 🎯 Upcoming Milestones
${upcomingMilestones || "No upcoming milestones"}

---

*Save your couple_id to use other features!*`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
