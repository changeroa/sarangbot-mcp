import { coupleRepository, dateLogRepository } from "../../db/repositories/index.js";
import { searchDateSpots } from "../../services/kakaoMap.js";
import type { ToolResponse } from "../../types/index.js";

interface RecommendDateParams {
  couple_id: string;
  type?: "place" | "course";
  category?: "restaurant" | "cafe" | "activity" | "all";
  location?: string;
  mood?: "romantic" | "active" | "casual" | "special";
  budget?: number;
}

// Mood-based recommendations
const MOOD_TIPS: Record<string, string> = {
  romantic: "분위기 좋은 곳으로 추천해요 💕",
  active: "활동적인 데이트를 원하시네요! 🏃",
  casual: "편안한 데이트 장소예요 ☕",
  special: "특별한 날을 위한 추천이에요 ✨"
};

// Budget-based price descriptions
function getPriceDescription(budget?: number): string {
  if (!budget) return "가격대 다양";
  if (budget < 30000) return "저렴한";
  if (budget < 50000) return "적당한";
  if (budget < 100000) return "고급";
  return "프리미엄";
}

export async function recommendDate({
  couple_id,
  category = "all",
  location = "강남",
  mood = "casual",
  budget
}: RecommendDateParams): Promise<ToolResponse> {
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

  // Get visited places to potentially exclude
  const visitedPlaces = await dateLogRepository.getVisitedPlaces(couple_id);

  // Search for places
  const places = await searchDateSpots(location, category, 5);

  if (places.length === 0) {
    return {
      content: [{
        type: "text",
        text: `❌ **Error**: No places found for "${location}". Try a different location.`
      }]
    };
  }

  // Mark visited places
  const recommendations = places.map((place, index) => {
    const isVisited = visitedPlaces.some(v =>
      v.toLowerCase().includes(place.name.toLowerCase()) ||
      place.name.toLowerCase().includes(v.toLowerCase())
    );

    return {
      ...place,
      isVisited,
      index: index + 1
    };
  });

  // Build place cards
  const placeCards = recommendations.map(place => {
    const visitedBadge = place.isVisited ? " *(방문함)*" : " *(새로운 곳!)*";
    const priceDesc = getPriceDescription(budget);

    return `### ${place.index}. ${place.name}${visitedBadge}
- **Category**: ${place.category}
- **Address**: ${place.road_address || place.address}
- **Price Range**: ${priceDesc}
- **Phone**: ${place.phone || "정보 없음"}
- **Map**: [카카오맵에서 보기](${place.url})`;
  }).join("\n\n");

  const moodTip = MOOD_TIPS[mood] || MOOD_TIPS.casual;
  const budgetNote = budget ? `\n*Budget: ${budget.toLocaleString()}원/인*` : "";

  const response = `## 🍽️ Date Recommendations

**Location**: ${location}
**Category**: ${category}
**Mood**: ${mood} - ${moodTip}${budgetNote}

---

${placeCards}

---

*새로운 곳을 가보는 건 어때요? 🌟*`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
