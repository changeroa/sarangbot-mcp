import { coupleRepository, gameLogRepository } from "../../db/repositories/index.js";
import { pickRandom } from "../../utils/random.js";
import type { ToolResponse } from "../../types/index.js";

interface WhoPayParams {
  couple_id: string;
}

export async function whoPays({ couple_id }: WhoPayParams): Promise<ToolResponse> {
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

  // Pick random winner
  const partners = [couple.partner1_name, couple.partner2_name];
  const winner = pickRandom(partners);

  // Log the game
  await gameLogRepository.create({
    couple_id,
    type: "who_pays",
    result: { winner }
  });

  // Get stats
  const stats = await gameLogRepository.getWhoPayStats(couple_id);
  const p1Count = stats[couple.partner1_name] || 0;
  const p2Count = stats[couple.partner2_name] || 0;

  // Generate streak message
  let streakMessage = "";
  const diff = Math.abs(p1Count - p2Count);
  if (diff >= 5) {
    const loser = p1Count > p2Count ? couple.partner1_name : couple.partner2_name;
    streakMessage = `\n*${loser} is on a losing streak! 😅*`;
  }

  const response = `## 🎰 Who Pays?

### Result: **${winner}** pays today! 💸

---

### 📊 History
| Partner | Times Paid |
|---------|------------|
| ${couple.partner1_name} | ${p1Count} |
| ${couple.partner2_name} | ${p2Count} |
${streakMessage}`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
