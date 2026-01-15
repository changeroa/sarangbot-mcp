import { z } from "zod";

// Prompt schemas (raw shapes for MCP SDK)
export const promptSchemas = {
  couple_onboarding: {},
  quick_start: {
    couple_id: z.string().optional().describe("기존 커플 ID (있는 경우)")
  }
};

// Prompt descriptions
export const promptDescriptions = {
  couple_onboarding: "커플 등록을 위한 온보딩 가이드. 처음 사용하는 커플을 위한 필수 정보 수집.",
  quick_start: "빠른 시작 가이드. 등록된 커플이면 바로 기능 사용, 아니면 등록 안내."
};

// Prompt templates
export const promptTemplates = {
  couple_onboarding: () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `안녕하세요! 커플 MCP 봇을 시작합니다.

서비스를 이용하기 위해 몇 가지 정보가 필요해요:

1. **두 분의 이름** (또는 애칭)
   - 예: 철수, 영희

2. **사귀기 시작한 날짜** (기념일)
   - 형식: YYYY-MM-DD
   - 예: 2024-06-15

위 정보를 알려주시면 \`register_couple\` 도구로 등록해드릴게요!

---

### 등록 후 사용 가능한 기능들:

**게임**
- \`who_pays\`: 오늘 누가 계산할까?
- \`pick_menu\`: 뭐 먹을지 정하기
- \`rock_paper_scissors\`: 가위바위보

**기념일**
- \`add_anniversary\`: 기념일 추가
- \`get_upcoming\`: 다가오는 기념일 확인
- \`suggest_anniversary\`: 기념일 선물/이벤트 추천

**데이트**
- \`recommend_date\`: 데이트 장소 추천 (카카오맵 연동)
- \`log_date\`: 다녀온 곳 기록
- \`get_date_history\`: 데이트 기록 조회`
        }
      }
    ]
  }),

  quick_start: (args: { couple_id?: string }) => {
    if (args.couple_id) {
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `커플 ID: ${args.couple_id}

무엇을 도와드릴까요?

**추천 명령어:**
- "오늘 누가 계산해?" → who_pays
- "뭐 먹을까?" → pick_menu
- "강남 데이트 장소 추천해줘" → recommend_date
- "다가오는 기념일 알려줘" → get_upcoming`
            }
          }
        ]
      };
    }

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `아직 등록된 커플 정보가 없어요.

먼저 커플 등록이 필요합니다. 다음 정보를 알려주세요:

1. 두 분의 이름 (예: 철수, 영희)
2. 사귀기 시작한 날짜 (예: 2024-06-15)

그러면 \`register_couple\` 도구로 등록해드릴게요!`
          }
        }
      ]
    };
  }
};
