import { coupleRepository, gameLogRepository } from "../../db/repositories/index.js";
import { pickRandom } from "../../utils/random.js";
import type { ToolResponse } from "../../types/index.js";

interface RandomPickParams {
  couple_id: string;
  options: string[];
  context?: string;
}

export async function randomPick({ couple_id, options, context }: RandomPickParams): Promise<ToolResponse> {
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

  // Validate options
  if (!options || options.length < 2) {
    return {
      content: [{
        type: "text",
        text: "❌ **Error**: Please provide at least 2 options to choose from."
      }]
    };
  }

  // Pick random option
  const picked = pickRandom(options);

  // Log the game
  await gameLogRepository.create({
    couple_id,
    type: "random",
    result: {
      picked,
      details: { options, context }
    }
  });

  // Format options list
  const optionsList = options.map((opt, idx) => {
    const marker = opt === picked ? "→" : " ";
    return `${marker} ${idx + 1}. ${opt}`;
  }).join("\n");

  const contextLine = context ? `\n*Context: ${context}*` : "";

  const response = `## 🎲 Random Pick

### Result: **${picked}**!

---

### Options
\`\`\`
${optionsList}
\`\`\`
${contextLine}`;

  return {
    content: [{
      type: "text",
      text: response
    }]
  };
}
