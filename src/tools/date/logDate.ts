import { coupleRepository, dateLogRepository } from "../../db/repositories/index.js";
import type { ToolResponse } from "../../types/index.js";

interface LogDateParams {
  couple_id: string;
  place_name: string;
  category?: string;
  location?: string;
  rating?: number;
  memo?: string;
  photos?: string[];
}

export async function logDate({
  couple_id,
  place_name,
  category = "기타",
  location,
  rating,
  memo,
  photos = []
}: LogDateParams): Promise<ToolResponse> {
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

  // Validate rating
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return {
      content: [{
        type: "text",
        text: "❌ **Error**: Rating must be between 1 and 5."
      }]
    };
  }

  // Create date log
  await dateLogRepository.create({
    couple_id,
    place_name,
    category,
    location,
    rating,
    memo,
    photos,
    visited_at: new Date()
  });

  // Build rating display
  const ratingDisplay = rating
    ? "⭐".repeat(rating) + "☆".repeat(5 - rating)
    : "평가 없음";

  const memoDisplay = memo
    ? `\n**메모**: ${memo}`
    : "";

  const photosDisplay = photos.length > 0
    ? `\n**사진**: ${photos.length}장 첨부됨`
    : "";

  const response = `## ✅ Date Logged Successfully!

### 📍 ${place_name}

- **Category**: ${category}
- **Location**: ${location || "위치 정보 없음"}
- **Rating**: ${ratingDisplay}
- **Date**: ${new Date().toLocaleDateString("ko-KR")}${memoDisplay}${photosDisplay}

---

*좋은 추억이 되셨길 바라요! 💕*`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
