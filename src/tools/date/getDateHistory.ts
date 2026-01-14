import { coupleRepository, dateLogRepository } from "../../db/repositories/index.js";
import type { ToolResponse } from "../../types/index.js";

interface GetDateHistoryParams {
  couple_id: string;
  limit?: number;
  category?: string;
}

export async function getDateHistory({
  couple_id,
  limit = 10,
  category
}: GetDateHistoryParams): Promise<ToolResponse> {
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

  // Get date history
  const history = await dateLogRepository.getHistory(couple_id, limit, category);

  if (history.length === 0) {
    const categoryNote = category ? ` in category "${category}"` : "";
    return {
      content: [{
        type: "text",
        text: `## 📋 Date History

*No date logs found${categoryNote}.*

Use \`log_date\` to record your dates!`
      }]
    };
  }

  // Build history cards
  const historyCards = history.map((log, index) => {
    const ratingDisplay = log.rating
      ? "⭐".repeat(log.rating) + "☆".repeat(5 - log.rating)
      : "평가 없음";

    const memoDisplay = log.memo
      ? `\n- **메모**: ${log.memo}`
      : "";

    const visitedDate = new Date(log.visited_at).toLocaleDateString("ko-KR");

    return `### ${index + 1}. ${log.place_name}
- **Category**: ${log.category}
- **Location**: ${log.location || "위치 정보 없음"}
- **Rating**: ${ratingDisplay}
- **Visited**: ${visitedDate}${memoDisplay}`;
  }).join("\n\n");

  // Calculate stats
  const totalDates = history.length;
  const ratedDates = history.filter(h => h.rating !== undefined);
  const avgRating = ratedDates.length > 0
    ? (ratedDates.reduce((sum, h) => sum + (h.rating || 0), 0) / ratedDates.length).toFixed(1)
    : "N/A";

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  history.forEach(h => {
    categoryBreakdown[h.category] = (categoryBreakdown[h.category] || 0) + 1;
  });

  const categoryStats = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `- ${cat}: ${count}회`)
    .join("\n");

  const filterNote = category ? ` (${category} only)` : "";

  const response = `## 📋 Date History${filterNote}

**Total Dates**: ${totalDates}
**Average Rating**: ${avgRating}

### Category Breakdown
${categoryStats}

---

${historyCards}

---

*더 많은 추억을 만들어가세요! 💑*`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
