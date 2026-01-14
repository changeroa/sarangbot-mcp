import { coupleRepository, anniversaryRepository } from "../../db/repositories/index.js";
import { calculateDDay, formatDate } from "../../utils/dateUtils.js";
import type { ToolResponse } from "../../types/index.js";

interface GetUpcomingParams {
  couple_id: string;
  days_ahead?: number;
}

export async function getUpcoming({
  couple_id,
  days_ahead = 90
}: GetUpcomingParams): Promise<ToolResponse> {
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

  // Calculate D-day
  const dDay = calculateDDay(couple.anniversary_date);

  // Get upcoming anniversaries
  const upcoming = await anniversaryRepository.getUpcoming(couple_id, days_ahead);

  // Calculate milestones
  const milestones = [
    { name: "100 Days", days: 100 },
    { name: "200 Days", days: 200 },
    { name: "300 Days", days: 300 },
    { name: "365 Days (1 Year)", days: 365 },
    { name: "500 Days", days: 500 },
    { name: "730 Days (2 Years)", days: 730 },
    { name: "1000 Days", days: 1000 },
    { name: "1095 Days (3 Years)", days: 1095 },
  ];

  const upcomingMilestones = milestones
    .filter(m => m.days > dDay && m.days - dDay <= days_ahead)
    .map(m => ({
      name: m.name,
      days_left: m.days - dDay
    }));

  // Build table rows for anniversaries
  const anniversaryRows = upcoming.map(u =>
    `| ${u.anniversary.name} | ${formatDate(u.next_date)} | ${u.days_left} |`
  ).join("\n");

  // Build table rows for milestones
  const milestoneRows = upcomingMilestones.map(m =>
    `| ${m.name} | - | ${m.days_left} |`
  ).join("\n");

  // Combine and sort all events
  const allRows = [anniversaryRows, milestoneRows]
    .filter(r => r.length > 0)
    .join("\n");

  const tableContent = allRows.length > 0
    ? `| Event | Date | Days Left |\n|-------|------|-----------|
${allRows}`
    : "*No upcoming events in the next " + days_ahead + " days*";

  const response = `## 💕 Couple Status

### D+Day: **${dDay}**
*Together since ${formatDate(couple.anniversary_date)}*

**Partners**: ${couple.partner1_name} & ${couple.partner2_name}

---

### 📅 Upcoming Events

${tableContent}

---

*Don't forget to prepare! 🎁*`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
