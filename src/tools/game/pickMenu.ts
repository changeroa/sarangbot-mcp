import { coupleRepository, gameLogRepository } from "../../db/repositories/index.js";
import { pickRandom } from "../../utils/random.js";
import type { ToolResponse } from "../../types/index.js";

interface PickMenuParams {
  couple_id: string;
  category?: "korean" | "chinese" | "japanese" | "western" | "all";
  exclude?: string[];
}

// Menu database
const MENUS: Record<string, Array<{ name: string; emoji: string; tip: string }>> = {
  korean: [
    { name: "삼겹살", emoji: "🥓", tip: "고기 먹고 싶은 날!" },
    { name: "김치찌개", emoji: "🍲", tip: "추운 날엔 뜨끈한 찌개!" },
    { name: "부대찌개", emoji: "🍲", tip: "든든하게 먹고 싶을 때!" },
    { name: "비빔밥", emoji: "🍚", tip: "건강하게 먹고 싶을 때!" },
    { name: "칼국수", emoji: "🍜", tip: "따뜻한 국물이 땡길 때!" },
    { name: "떡볶이", emoji: "🍢", tip: "매콤한 게 땡길 때!" },
    { name: "치킨", emoji: "🍗", tip: "치킨은 언제나 옳다!" },
    { name: "삼계탕", emoji: "🍲", tip: "몸보신이 필요할 때!" },
    { name: "냉면", emoji: "🍜", tip: "시원하게 먹고 싶을 때!" },
    { name: "족발", emoji: "🦶", tip: "야식으로 최고!" },
  ],
  chinese: [
    { name: "짜장면", emoji: "🍝", tip: "클래식한 선택!" },
    { name: "짬뽕", emoji: "🍜", tip: "얼큰한 게 땡길 때!" },
    { name: "탕수육", emoji: "🍖", tip: "바삭하게!" },
    { name: "마라탕", emoji: "🌶️", tip: "매운 맛 원할 때!" },
    { name: "양꼬치", emoji: "🍢", tip: "이국적인 맛!" },
    { name: "마라샹궈", emoji: "🥘", tip: "볶음이 땡길 때!" },
  ],
  japanese: [
    { name: "초밥", emoji: "🍣", tip: "신선하게!" },
    { name: "라멘", emoji: "🍜", tip: "진한 국물!" },
    { name: "돈카츠", emoji: "🍱", tip: "바삭바삭!" },
    { name: "우동", emoji: "🍜", tip: "담백하게!" },
    { name: "카레", emoji: "🍛", tip: "든든하게!" },
    { name: "오코노미야끼", emoji: "🥞", tip: "철판 요리!" },
  ],
  western: [
    { name: "파스타", emoji: "🍝", tip: "분위기 있게!" },
    { name: "피자", emoji: "🍕", tip: "함께 나눠먹기 좋아!" },
    { name: "햄버거", emoji: "🍔", tip: "간편하게!" },
    { name: "스테이크", emoji: "🥩", tip: "특별한 날!" },
    { name: "샐러드", emoji: "🥗", tip: "건강하게!" },
    { name: "리조또", emoji: "🍚", tip: "부드럽게!" },
  ],
};

export async function pickMenu({ couple_id, category = "all", exclude = [] }: PickMenuParams): Promise<ToolResponse> {
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

  // Collect menus based on category
  let menuPool: Array<{ name: string; emoji: string; tip: string }> = [];

  if (category === "all") {
    menuPool = Object.values(MENUS).flat();
  } else {
    menuPool = MENUS[category] || [];
  }

  // Filter excluded menus
  if (exclude.length > 0) {
    const excludeLower = exclude.map(e => e.toLowerCase());
    menuPool = menuPool.filter(m => !excludeLower.includes(m.name.toLowerCase()));
  }

  if (menuPool.length === 0) {
    return {
      content: [{
        type: "text",
        text: "❌ **Error**: No menus available with the given filters."
      }]
    };
  }

  // Pick random menu
  const picked = pickRandom(menuPool);

  // Log the game
  await gameLogRepository.create({
    couple_id,
    type: "menu",
    result: { picked: picked.name }
  });

  const response = `## 🍽️ Today's Menu

### 🎲 Result: **${picked.name}** ${picked.emoji}

> "${picked.tip}"

---

*This choice has been saved to your records!*`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
