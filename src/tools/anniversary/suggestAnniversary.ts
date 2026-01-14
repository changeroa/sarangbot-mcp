import { coupleRepository } from "../../db/repositories/index.js";
import type { ToolResponse } from "../../types/index.js";

interface SuggestAnniversaryParams {
  couple_id: string;
  anniversary_type: string;
  budget?: number;
}

// Suggestion database
const SUGGESTIONS: Record<string, {
  gifts: Array<{ item: string; price: string; description: string }>;
  places: Array<{ name: string; type: string; price: string }>;
  activities: string[];
}> = {
  "100days": {
    gifts: [
      { item: "커플 반지", price: "5-15만원", description: "첫 커플 아이템으로 인기" },
      { item: "포토북", price: "3-5만원", description: "100일간의 추억을 담아서" },
      { item: "향수", price: "10-20만원", description: "상대방 취향에 맞는 향" },
    ],
    places: [
      { name: "분위기 좋은 레스토랑", type: "Fine Dining", price: "10-15만원" },
      { name: "루프탑 바", type: "Bar", price: "5-10만원" },
      { name: "호캉스", type: "Hotel", price: "15-30만원" },
    ],
    activities: ["커플 사진 촬영", "야경 드라이브", "편지 쓰기"]
  },
  "200days": {
    gifts: [
      { item: "명품 지갑/카드지갑", price: "20-50만원", description: "실용적인 명품" },
      { item: "커플 시계", price: "10-30만원", description: "같은 시간을 공유" },
      { item: "화장품 세트", price: "10-20만원", description: "스킨케어/메이크업" },
    ],
    places: [
      { name: "오마카세", type: "Japanese", price: "10-20만원" },
      { name: "와인 바", type: "Wine Bar", price: "8-15만원" },
      { name: "스파", type: "Spa", price: "15-25만원" },
    ],
    activities: ["커플 마사지", "와인 클래스", "쿠킹 클래스"]
  },
  "1year": {
    gifts: [
      { item: "명품 가방", price: "50-200만원", description: "특별한 날의 특별한 선물" },
      { item: "여행 티켓", price: "50-100만원", description: "둘만의 여행" },
      { item: "커플 목걸이", price: "10-30만원", description: "1주년 기념" },
    ],
    places: [
      { name: "파인다이닝", type: "Fine Dining", price: "15-30만원" },
      { name: "호텔 레스토랑", type: "Hotel Restaurant", price: "15-25만원" },
      { name: "여행지", type: "Travel", price: "50만원+" },
    ],
    activities: ["1박 2일 여행", "스카이다이빙", "프로포즈"]
  },
  "birthday": {
    gifts: [
      { item: "원하던 아이템", price: "가격대 다양", description: "평소 갖고 싶어하던 것" },
      { item: "케이크 + 꽃", price: "5-10만원", description: "기본이지만 확실한" },
      { item: "서프라이즈 파티", price: "10-20만원", description: "친구들과 함께" },
    ],
    places: [
      { name: "좋아하는 음식점", type: "Favorite", price: "가격대 다양" },
      { name: "분위기 좋은 카페", type: "Cafe", price: "2-5만원" },
      { name: "테마파크", type: "Theme Park", price: "10-15만원" },
    ],
    activities: ["생일 파티", "버킷리스트 도전", "편지 전달"]
  },
  "default": {
    gifts: [
      { item: "꽃다발", price: "3-10만원", description: "언제나 감동" },
      { item: "디저트", price: "2-5만원", description: "달콤한 선물" },
      { item: "손편지", price: "무료", description: "진심을 담아" },
    ],
    places: [
      { name: "맛집", type: "Restaurant", price: "3-5만원" },
      { name: "카페", type: "Cafe", price: "2-3만원" },
      { name: "영화관", type: "Cinema", price: "3만원" },
    ],
    activities: ["산책", "영화 보기", "집에서 요리"]
  }
};

export async function suggestAnniversary({
  couple_id,
  anniversary_type,
  budget
}: SuggestAnniversaryParams): Promise<ToolResponse> {
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

  // Normalize anniversary type
  const normalizedType = anniversary_type.toLowerCase()
    .replace(/\s+/g, "")
    .replace(/일/g, "days")
    .replace(/년/g, "year")
    .replace("days", "days")
    .replace("year", "year");

  // Get suggestions
  const suggestions = SUGGESTIONS[normalizedType] || SUGGESTIONS["default"];

  // Build gift table
  const giftRows = suggestions.gifts
    .map(g => `| ${g.item} | ${g.price} | ${g.description} |`)
    .join("\n");

  // Build places table
  const placeRows = suggestions.places
    .map(p => `| ${p.name} | ${p.type} | ${p.price} |`)
    .join("\n");

  // Build activities list
  const activitiesList = suggestions.activities
    .map(a => `- ${a}`)
    .join("\n");

  const budgetNote = budget
    ? `\n*Budget: ${budget.toLocaleString()}원*`
    : "";

  const response = `## 🎁 Anniversary Suggestions

**For**: ${anniversary_type}${budgetNote}

---

### 🎁 Gift Ideas
| Item | Price Range | Description |
|------|-------------|-------------|
${giftRows}

---

### 🍽️ Place Ideas
| Place | Type | Price Range |
|-------|------|-------------|
${placeRows}

---

### 🎯 Activity Ideas
${activitiesList}

---

*Mix and match to create the perfect celebration!*`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
