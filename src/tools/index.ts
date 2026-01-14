import { z } from "zod";

// Game Tools
export { whoPays } from "./game/whoPays.js";
export { pickMenu } from "./game/pickMenu.js";
export { randomPick } from "./game/randomPick.js";
export { rockPaperScissors } from "./game/rockPaperScissors.js";
export { getGameStats } from "./game/getGameStats.js";

// Anniversary Tools
export { registerCouple } from "./anniversary/registerCouple.js";
export { addAnniversary } from "./anniversary/addAnniversary.js";
export { getUpcoming } from "./anniversary/getUpcoming.js";
export { suggestAnniversary } from "./anniversary/suggestAnniversary.js";

// Date Tools
export { recommendDate } from "./date/recommendDate.js";
export { logDate } from "./date/logDate.js";
export { getDateHistory } from "./date/getDateHistory.js";

// Tool Schemas for MCP Registration (using shape for SDK compatibility)
export const toolSchemas = {
  // ==================== Game Tools ====================
  who_pays: {
    couple_id: z.string().describe("커플 고유 ID"),
  },
  pick_menu: {
    couple_id: z.string().describe("커플 고유 ID"),
    category: z.enum(["korean", "chinese", "japanese", "western", "all"]).optional().describe("음식 카테고리"),
    exclude: z.array(z.string()).optional().describe("제외할 메뉴 목록"),
  },
  random_pick: {
    couple_id: z.string().describe("커플 고유 ID"),
    options: z.array(z.string()).min(2).describe("선택 항목 목록 (최소 2개)"),
    description: z.string().optional().describe("무엇을 고르는지 설명"),
  },
  rock_paper_scissors: {
    couple_id: z.string().describe("커플 고유 ID"),
    player1_choice: z.enum(["rock", "paper", "scissors"]).describe("파트너1의 선택 (가위/바위/보)"),
    player2_choice: z.enum(["rock", "paper", "scissors"]).describe("파트너2의 선택 (가위/바위/보)"),
  },
  get_game_stats: {
    couple_id: z.string().describe("커플 고유 ID"),
  },

  // ==================== Anniversary Tools ====================
  register_couple: {
    kakao_user_id: z.string().describe("카카오 유저 ID"),
    anniversary_date: z.string().describe("사귀기 시작한 날짜 (YYYY-MM-DD)"),
    partner1_name: z.string().optional().describe("첫 번째 파트너 이름/닉네임"),
    partner2_name: z.string().optional().describe("두 번째 파트너 이름/닉네임"),
  },
  add_anniversary: {
    couple_id: z.string().describe("커플 고유 ID"),
    name: z.string().describe("기념일 이름"),
    date: z.string().describe("기념일 날짜 (YYYY-MM-DD)"),
    yearly: z.boolean().optional().describe("매년 반복 여부 (기본: true)"),
    reminder_days: z.array(z.number()).optional().describe("며칠 전 알림 (예: [7, 3, 1])"),
  },
  get_upcoming: {
    couple_id: z.string().describe("커플 고유 ID"),
    days_ahead: z.number().optional().describe("앞으로 몇 일까지 볼지 (기본: 90)"),
  },
  suggest_anniversary: {
    couple_id: z.string().describe("커플 고유 ID"),
    anniversary_type: z.string().describe("기념일 종류 (예: 100일, 1년, birthday)"),
    budget: z.number().optional().describe("예산 (원)"),
  },

  // ==================== Date Tools ====================
  recommend_date: {
    couple_id: z.string().describe("커플 고유 ID"),
    category: z.enum(["restaurant", "cafe", "activity", "all"]).optional().describe("장소 카테고리"),
    location: z.string().optional().describe("위치/지역 (예: 강남, 홍대)"),
    mood: z.enum(["romantic", "active", "casual", "special"]).optional().describe("분위기"),
    budget: z.number().optional().describe("1인 예산 (원)"),
  },
  log_date: {
    couple_id: z.string().describe("커플 고유 ID"),
    place_name: z.string().describe("장소 이름"),
    category: z.string().optional().describe("장소 카테고리"),
    location: z.string().optional().describe("위치"),
    rating: z.number().min(1).max(5).optional().describe("별점 (1-5)"),
    memo: z.string().optional().describe("메모/후기"),
    photos: z.array(z.string()).optional().describe("사진 URL 목록"),
  },
  get_date_history: {
    couple_id: z.string().describe("커플 고유 ID"),
    limit: z.number().optional().describe("조회 개수 (기본: 10)"),
    category: z.string().optional().describe("카테고리 필터"),
  },
};

// Tool descriptions
export const toolDescriptions = {
  who_pays: "오늘 누가 계산할지 랜덤으로 결정합니다. 공정한 결과를 위해 이전 결과도 보여줍니다.",
  pick_menu: "오늘 뭐 먹을지 랜덤으로 메뉴를 골라줍니다. 카테고리 필터와 제외 메뉴 설정 가능.",
  random_pick: "입력한 항목들 중 하나를 랜덤으로 선택합니다. 데이트 장소, 영화, 활동 등 무엇이든 가능.",
  rock_paper_scissors: "가위바위보 게임을 합니다. 두 파트너가 동시에 선택하여 승자를 결정합니다.",
  get_game_stats: "커플의 게임 통계를 보여줍니다. 누가 계산 몇 번, 가위바위보 전적 등.",
  register_couple: "새로운 커플을 등록합니다. 모든 기능 사용을 위해 먼저 등록이 필요합니다.",
  add_anniversary: "기념일을 추가합니다. 생일, 첫 만남, 특별한 날 등 커스텀 기념일 등록.",
  get_upcoming: "다가오는 기념일과 D-day 정보를 보여줍니다. 100일, 1주년 등 마일스톤도 포함.",
  suggest_anniversary: "기념일에 맞는 선물, 장소, 활동을 추천합니다. 예산에 맞는 아이디어 제공.",
  recommend_date: "데이트 장소를 추천합니다. 카카오맵 연동으로 실제 장소 정보 제공.",
  log_date: "데이트 기록을 저장합니다. 별점, 메모, 사진 첨부 가능.",
  get_date_history: "데이트 히스토리를 조회합니다. 방문 장소, 별점, 메모 확인.",
};
