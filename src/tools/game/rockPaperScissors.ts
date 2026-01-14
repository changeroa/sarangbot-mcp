import { coupleRepository, gameLogRepository } from "../../db/repositories/index.js";
import type { ToolResponse } from "../../types/index.js";

type Choice = "rock" | "paper" | "scissors";

interface RPSParams {
  couple_id: string;
  player1_choice: Choice;
  player2_choice: Choice;
}

const EMOJIS: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️"
};

const KOREAN: Record<Choice, string> = {
  rock: "바위",
  paper: "보",
  scissors: "가위"
};

function determineWinner(p1: Choice, p2: Choice): "player1" | "player2" | "draw" {
  if (p1 === p2) return "draw";

  if (
    (p1 === "rock" && p2 === "scissors") ||
    (p1 === "paper" && p2 === "rock") ||
    (p1 === "scissors" && p2 === "paper")
  ) {
    return "player1";
  }

  return "player2";
}

export async function rockPaperScissors({
  couple_id,
  player1_choice,
  player2_choice
}: RPSParams): Promise<ToolResponse> {
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

  // Determine winner
  const result = determineWinner(player1_choice, player2_choice);

  let winnerName: string | null = null;
  if (result === "player1") {
    winnerName = couple.partner1_name;
  } else if (result === "player2") {
    winnerName = couple.partner2_name;
  }

  // Log the game
  await gameLogRepository.create({
    couple_id,
    type: "rps",
    result: {
      winner: winnerName || "draw",
      details: {
        player1_choice,
        player2_choice
      }
    }
  });

  // Get stats
  const stats = await gameLogRepository.getRPSStats(
    couple_id,
    couple.partner1_name,
    couple.partner2_name
  );

  // Generate result message
  let resultMessage: string;
  if (result === "draw") {
    resultMessage = "### 🤝 Draw!";
  } else {
    resultMessage = `### 🎉 Winner: **${winnerName}**!`;
  }

  const response = `## ✊✌️✋ Rock Paper Scissors!

### Results
| Player | Choice |
|--------|--------|
| ${couple.partner1_name} | ${EMOJIS[player1_choice]} ${KOREAN[player1_choice]} |
| ${couple.partner2_name} | ${EMOJIS[player2_choice]} ${KOREAN[player2_choice]} |

${resultMessage}

---

### 📊 Overall Stats
| Player | Wins | Losses | Draws |
|--------|------|--------|-------|
| ${couple.partner1_name} | ${stats.partner1_wins} | ${stats.partner2_wins} | ${stats.draws} |
| ${couple.partner2_name} | ${stats.partner2_wins} | ${stats.partner1_wins} | ${stats.draws} |`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
