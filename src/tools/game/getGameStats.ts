import { coupleRepository, gameLogRepository } from "../../db/repositories/index.js";
import type { ToolResponse } from "../../types/index.js";

interface GetGameStatsParams {
  couple_id: string;
}

export async function getGameStats({ couple_id }: GetGameStatsParams): Promise<ToolResponse> {
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

  // Get all stats
  const stats = await gameLogRepository.getAllStats(
    couple_id,
    couple.partner1_name,
    couple.partner2_name
  );

  // Format who_pays stats
  const p1PayCount = stats.who_pays[couple.partner1_name] || 0;
  const p2PayCount = stats.who_pays[couple.partner2_name] || 0;

  // Determine who paid more
  let whoPaysSummary = "";
  if (p1PayCount > p2PayCount) {
    whoPaysSummary = `${couple.partner1_name} has paid ${p1PayCount - p2PayCount} more times`;
  } else if (p2PayCount > p1PayCount) {
    whoPaysSummary = `${couple.partner2_name} has paid ${p2PayCount - p1PayCount} more times`;
  } else {
    whoPaysSummary = "Both have paid equally!";
  }

  // Format RPS stats
  let rpsSummary = "";
  if (stats.rps.partner1_wins > stats.rps.partner2_wins) {
    rpsSummary = `${couple.partner1_name} is winning!`;
  } else if (stats.rps.partner2_wins > stats.rps.partner1_wins) {
    rpsSummary = `${couple.partner2_name} is winning!`;
  } else {
    rpsSummary = "It's a tie!";
  }

  const response = `## 📊 Game Statistics

### 💸 Who Pays
| Partner | Times Paid |
|---------|------------|
| ${couple.partner1_name} | ${p1PayCount} |
| ${couple.partner2_name} | ${p2PayCount} |

*${whoPaysSummary}*

---

### ✊✌️✋ Rock Paper Scissors
| Player | Wins | Losses | Draws |
|--------|------|--------|-------|
| ${couple.partner1_name} | ${stats.rps.partner1_wins} | ${stats.rps.partner2_wins} | ${stats.rps.draws} |
| ${couple.partner2_name} | ${stats.rps.partner2_wins} | ${stats.rps.partner1_wins} | ${stats.rps.draws} |

*${rpsSummary}*

---

### 📈 Total
- **Total Games Played**: ${stats.total_games}`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
