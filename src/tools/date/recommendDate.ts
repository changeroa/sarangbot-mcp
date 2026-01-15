import { coupleRepository } from "../../db/repositories/index.js";
import { searchDateSpots, KakaoApiError, getDirectionsUrl } from "../../services/kakaoMap.js";
import { logger } from "../../utils/logger.js";
import type { ToolResponse } from "../../types/index.js";

interface RecommendDateParams {
  couple_id: string;
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
  if (budget < 30000) return "💰 저렴한";
  if (budget < 50000) return "💰💰 적당한";
  if (budget < 100000) return "💰💰💰 고급";
  return "💎 프리미엄";
}

export async function recommendDate({
  couple_id,
  category = "all",
  location = "강남",
  mood = "casual",
  budget
}: RecommendDateParams): Promise<ToolResponse> {
  const startTime = performance.now();

  try {
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

    // Search for places using real Kakao Map API
    const places = await searchDateSpots(location, category, 5);

    if (places.length === 0) {
      return {
        content: [{
          type: "text",
          text: `## 🔍 검색 결과 없음

**Location**: ${location}
**Category**: ${category}

해당 지역에서 "${category}" 관련 장소를 찾을 수 없어요.

**💡 Suggestions**:
- 다른 지역명으로 검색해보세요 (예: 홍대, 이태원, 성수)
- 카테고리를 "all"로 변경해보세요
- 더 넓은 지역명을 사용해보세요 (예: 서울, 강남구)`
        }]
      };
    }

    // Build place cards with real data
    const placeCards = places.map((place, index) => {
      const priceDesc = getPriceDescription(budget);
      const directionsUrl = getDirectionsUrl(place.name, place.y, place.x);

      return `### ${index + 1}. ${place.name}
- **카테고리**: ${place.category}
- **주소**: ${place.road_address || place.address}
- **가격대**: ${priceDesc}
- **전화**: ${place.phone || "정보 없음"}
- **🗺️ 지도**: [카카오맵에서 보기](${place.url})
- **🚗 길찾기**: [길찾기](${directionsUrl})`;
    }).join("\n\n");

    const moodTip = MOOD_TIPS[mood] || MOOD_TIPS.casual;
    const budgetNote = budget ? `\n**예산**: ${budget.toLocaleString()}원/인` : "";
    const duration = performance.now() - startTime;

    logger.info({
      coupleId: couple_id,
      location,
      category,
      resultsCount: places.length,
      duration: `${duration.toFixed(2)}ms`
    }, "Date recommendation completed");

    const response = `## 🍽️ ${couple.partner1_name} & ${couple.partner2_name}의 데이트 추천

**📍 지역**: ${location}
**🏷️ 카테고리**: ${category === "all" ? "전체" : category}
**💭 분위기**: ${mood} - ${moodTip}${budgetNote}

---

${placeCards}

---

### 💡 Tips
- 마음에 드는 곳이 있다면 \`log_date\`로 기록해두세요!
- 다른 지역도 검색해보세요 (예: 홍대, 이태원, 성수)`;

    return {
      content: [{
        type: "text",
        text: response
      }]
    };

  } catch (error) {
    const duration = performance.now() - startTime;

    // Handle Kakao API specific errors
    if (error instanceof KakaoApiError) {
      logger.error({
        coupleId: couple_id,
        location,
        error: error.message,
        statusCode: error.statusCode,
        duration: `${duration.toFixed(2)}ms`
      }, "Kakao API error in recommendDate");

      if (error.isApiKeyMissing) {
        return {
          content: [{
            type: "text",
            text: `❌ **API 설정 오류**

카카오 API 키가 설정되지 않았습니다.

**관리자에게 문의하세요.**`
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: `❌ **장소 검색 실패**

카카오맵 API 연동 중 오류가 발생했습니다.

**오류**: ${error.message}

**💡 잠시 후 다시 시도해주세요.**`
        }]
      };
    }

    // Handle unexpected errors
    logger.error({
      coupleId: couple_id,
      location,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: `${duration.toFixed(2)}ms`
    }, "Unexpected error in recommendDate");

    return {
      content: [{
        type: "text",
        text: `❌ **오류 발생**

데이트 장소 추천 중 예상치 못한 오류가 발생했습니다.

**잠시 후 다시 시도해주세요.**`
      }]
    };
  }
}
