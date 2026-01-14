# Couple MCP Server - 구현 명세서

> 카카오 PlayMCP 기반 커플 AI 컨시어지 서비스

---

## 1. 개요

### 1.1 서비스 목적
카카오톡 AI 에이전트와 연동되어 커플의 일상적인 의사결정(데이트, 식사, 내기)과 기념일 관리를 도와주는 MCP 서버

### 1.2 기술 스택

| 구분 | 기술 | 버전 |
|-----|-----|-----|
| Runtime | Node.js | >= 18.x |
| Language | TypeScript | 5.x |
| MCP SDK | @modelcontextprotocol/sdk | >= 1.10.0 |
| Web Framework | Express | 4.x |
| Database | MongoDB Atlas | - |
| Validation | Zod | >= 3.25 |
| 배포 | Railway / Render | - |

### 1.3 PlayMCP 요구사항

- **Transport**: Streamable HTTP (원격 서버 전용)
- **Endpoint**: 단일 `/mcp` 엔드포인트
- **HTTP Methods**: POST (요청), GET (SSE), DELETE (세션 종료)
- **인증**: Key/Token 또는 OAuth 2.0 지원

---

## 2. 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        카카오톡 / PlayMCP                        │
│                      (AI 에이전트가 Tool 호출)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (Streamable HTTP)
                             │ POST /mcp
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Couple MCP Server                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Express Server                         │  │
│  │                    (Port 3000)                            │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                     │
│  ┌────────────────────────┴─────────────────────────────────┐  │
│  │              StreamableHTTPServerTransport                │  │
│  │                  (Session Management)                     │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                     │
│  ┌────────────────────────┴─────────────────────────────────┐  │
│  │                      MCP Server                           │  │
│  │  ┌─────────┐  ┌─────────────┐  ┌──────────┐              │  │
│  │  │  Date   │  │ Anniversary │  │   Game   │              │  │
│  │  │  Tools  │  │    Tools    │  │  Tools   │              │  │
│  │  └────┬────┘  └──────┬──────┘  └────┬─────┘              │  │
│  │       └──────────────┼──────────────┘                    │  │
│  │                      ▼                                    │  │
│  │              ┌──────────────┐                            │  │
│  │              │   Services   │                            │  │
│  │              │ (Kakao Map)  │                            │  │
│  │              └──────────────┘                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│              ┌──────────────────────┐                          │
│              │    MongoDB Atlas     │                          │
│              │  - couples           │                          │
│              │  - anniversaries     │                          │
│              │  - date_logs         │                          │
│              │  - game_logs         │                          │
│              └──────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 프로젝트 구조

```
couple-mcp/
├── src/
│   ├── index.ts                    # 진입점
│   ├── server.ts                   # MCP 서버 설정
│   ├── transport.ts                # Streamable HTTP Transport
│   │
│   ├── tools/                      # MCP Tools
│   │   ├── index.ts                # Tool 등록
│   │   ├── date/
│   │   │   ├── recommendDate.ts    # 데이트 추천
│   │   │   ├── logDate.ts          # 데이트 기록
│   │   │   └── getDateHistory.ts   # 히스토리 조회
│   │   ├── anniversary/
│   │   │   ├── registerCouple.ts   # 커플 등록
│   │   │   ├── addAnniversary.ts   # 기념일 추가
│   │   │   ├── getUpcoming.ts      # 다가오는 기념일
│   │   │   └── suggestAnniversary.ts # 기념일 추천
│   │   └── game/
│   │       ├── whoPays.ts          # 누가 쏨
│   │       ├── pickMenu.ts         # 메뉴 선택
│   │       ├── randomPick.ts       # 랜덤 선택
│   │       ├── rockPaperScissors.ts # 가위바위보
│   │       └── getGameStats.ts     # 게임 통계
│   │
│   ├── services/                   # 외부 서비스 연동
│   │   ├── kakaoMap.ts             # 카카오맵 API
│   │   └── weather.ts              # 날씨 API (optional)
│   │
│   ├── db/                         # 데이터베이스
│   │   ├── connection.ts           # MongoDB 연결
│   │   ├── models/
│   │   │   ├── Couple.ts
│   │   │   ├── Anniversary.ts
│   │   │   ├── DateLog.ts
│   │   │   └── GameLog.ts
│   │   └── repositories/
│   │       ├── coupleRepository.ts
│   │       ├── anniversaryRepository.ts
│   │       ├── dateLogRepository.ts
│   │       └── gameLogRepository.ts
│   │
│   ├── utils/
│   │   ├── random.ts               # 랜덤 유틸
│   │   ├── dateUtils.ts            # 날짜 유틸
│   │   └── formatters.ts           # 응답 포매터
│   │
│   └── types/
│       └── index.ts                # 타입 정의
│
├── tests/
│   ├── tools/
│   └── services/
│
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. MCP Tools 상세 명세

### 3.1 Tool 설계 원칙

PlayMCP 가이드라인에 따른 설계 원칙:

1. **영어로 작성**: Tool name, description, parameter 모두 영어 (토큰 효율성)
2. **명확한 description**: AI가 Tool 선택에 활용
3. **JSON Schema inputSchema**: 파라미터 타입/제약 명시
4. **포맷팅된 응답**: JSON/Markdown으로 구조화된 응답

---

### 3.2 Date Tools

#### 3.2.1 recommend_date

**목적**: 데이트 장소/코스 추천

```typescript
{
  name: "recommend_date",
  description: "Recommend date places or courses for couples. Returns real places with details based on location, mood, and budget. Use this when couple asks for date recommendations, restaurant suggestions, or activity ideas.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      type: {
        type: "string",
        enum: ["place", "course"],
        description: "Recommendation type - single place or full course"
      },
      category: {
        type: "string",
        enum: ["restaurant", "cafe", "activity", "all"],
        description: "Category filter for recommendations"
      },
      location: {
        type: "string",
        description: "Location keyword (e.g., '강남역', '홍대')"
      },
      mood: {
        type: "string",
        enum: ["romantic", "active", "casual", "special"],
        description: "Desired mood for the date"
      },
      budget: {
        type: "number",
        description: "Budget per person in KRW"
      }
    },
    required: ["couple_id"]
  }
}
```

**응답 형식**:
```typescript
{
  content: [{
    type: "text",
    text: `## 🍽️ Date Recommendations

### 1. 육전식당
- **Category**: Korean Restaurant
- **Address**: 서울 강남구 강남대로 123
- **Price Range**: 15,000 - 25,000 KRW/person
- **Rating**: 4.5/5
- **Why Recommended**: Perfect for cold weather, cozy atmosphere
- **Map**: https://map.kakao.com/...

### 2. 라멜라
- **Category**: Italian Restaurant
- **Address**: 서울 강남구 논현로 456
- **Price Range**: 20,000 - 35,000 KRW/person
- **Rating**: 4.3/5
- **Why Recommended**: Romantic atmosphere, great for dates
- **Map**: https://map.kakao.com/...

---
*Recommendations based on your location and preferences*`
  }]
}
```

#### 3.2.2 log_date

**목적**: 데이트 기록 저장

```typescript
{
  name: "log_date",
  description: "Save a date record for the couple. Use when couple wants to remember or log their date experience.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      place: {
        type: "string",
        description: "Place name or description"
      },
      memo: {
        type: "string",
        description: "Optional memo or note about the date"
      },
      rating: {
        type: "number",
        minimum: 1,
        maximum: 5,
        description: "Satisfaction rating 1-5"
      }
    },
    required: ["couple_id", "place"]
  }
}
```

**응답 형식**:
```typescript
{
  content: [{
    type: "text",
    text: `## 💕 Date Logged!

- **Date ID**: date_abc123
- **D+Day**: 213
- **Place**: 한강 피크닉
- **Memo**: 날씨 좋아서 최고였어
- **Rating**: ⭐⭐⭐⭐⭐

Your memory has been saved! 📸`
  }]
}
```

#### 3.2.3 get_date_history

**목적**: 데이트 히스토리 조회

```typescript
{
  name: "get_date_history",
  description: "Get past date records for the couple. Use when couple wants to see their date history or memories.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      limit: {
        type: "number",
        default: 10,
        description: "Number of records to return"
      }
    },
    required: ["couple_id"]
  }
}
```

---

### 3.3 Anniversary Tools

#### 3.3.1 register_couple

**목적**: 커플 등록 및 사귄 날 설정

```typescript
{
  name: "register_couple",
  description: "Register a new couple with their anniversary date. Use when couple wants to start using the service or set their relationship start date.",
  inputSchema: {
    type: "object",
    properties: {
      kakao_user_id: {
        type: "string",
        description: "Kakao user ID of the person registering"
      },
      anniversary_date: {
        type: "string",
        format: "date",
        description: "Relationship start date (YYYY-MM-DD)"
      },
      partner1_name: {
        type: "string",
        description: "Name of partner 1"
      },
      partner2_name: {
        type: "string",
        description: "Name of partner 2"
      }
    },
    required: ["kakao_user_id", "anniversary_date"]
  }
}
```

**응답 형식**:
```typescript
{
  content: [{
    type: "text",
    text: `## 💑 Couple Registered!

- **Couple ID**: couple_xyz789
- **Anniversary**: 2024-06-15
- **Today's D+Day**: 213
- **Partners**: 철수 & 영희

Welcome to Couple MCP! 💕

### Upcoming Milestones
- 300 Days: 87 days left
- 1 Year: 152 days left`
  }]
}
```

#### 3.3.2 add_anniversary

**목적**: 기념일 추가

```typescript
{
  name: "add_anniversary",
  description: "Add a custom anniversary or special date. Use when couple wants to remember birthdays, first kiss, first trip, etc.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      name: {
        type: "string",
        description: "Anniversary name (e.g., 'First Kiss', 'Birthday')"
      },
      date: {
        type: "string",
        format: "date",
        description: "Date of the anniversary (YYYY-MM-DD)"
      },
      yearly: {
        type: "boolean",
        default: true,
        description: "Whether this repeats yearly"
      }
    },
    required: ["couple_id", "name", "date"]
  }
}
```

#### 3.3.3 get_upcoming

**목적**: D-day 및 다가오는 기념일 조회

```typescript
{
  name: "get_upcoming",
  description: "Get current D+day count and upcoming anniversaries. Use when couple asks about their relationship duration or upcoming special dates.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      days_ahead: {
        type: "number",
        default: 90,
        description: "How many days ahead to look for anniversaries"
      }
    },
    required: ["couple_id"]
  }
}
```

**응답 형식**:
```typescript
{
  content: [{
    type: "text",
    text: `## 💕 Couple Status

### D+Day: **213**
*Together since 2024-06-15*

---

### 📅 Upcoming Anniversaries

| Event | Date | Days Left |
|-------|------|-----------|
| 300 Days | 2025-04-11 | 87 |
| 영희 Birthday | 2025-02-06 | 23 |
| 1 Year | 2025-06-15 | 152 |

---
*Don't forget to prepare! 🎁*`
  }]
}
```

#### 3.3.4 suggest_anniversary

**목적**: 기념일 선물/장소 간단 추천

```typescript
{
  name: "suggest_anniversary",
  description: "Get gift and place suggestions for an upcoming anniversary. Use when couple needs ideas for celebrating.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      anniversary_type: {
        type: "string",
        description: "Type of anniversary (e.g., '100days', 'birthday', '1year')"
      },
      budget: {
        type: "number",
        description: "Total budget in KRW"
      }
    },
    required: ["couple_id", "anniversary_type"]
  }
}
```

---

### 3.4 Game Tools

#### 3.4.1 who_pays

**목적**: 계산자 랜덤 결정

```typescript
{
  name: "who_pays",
  description: "Randomly decide who pays for the meal/activity. Use when couple is deciding who should pay.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      }
    },
    required: ["couple_id"]
  }
}
```

**응답 형식**:
```typescript
{
  content: [{
    type: "text",
    text: `## 🎰 Who Pays?

### Result: **철수** pays today! 💸

---

### 📊 History
| Partner | Times Paid |
|---------|------------|
| 철수 | 15 |
| 영희 | 8 |

*철수 is on a losing streak! 😅*`
  }]
}
```

#### 3.4.2 pick_menu

**목적**: 메뉴 랜덤 선택

```typescript
{
  name: "pick_menu",
  description: "Randomly pick a menu/food category. Use when couple can't decide what to eat.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      category: {
        type: "string",
        enum: ["korean", "chinese", "japanese", "western", "all"],
        description: "Food category to pick from"
      },
      exclude: {
        type: "array",
        items: { type: "string" },
        description: "Menus to exclude from selection"
      }
    },
    required: ["couple_id"]
  }
}
```

**응답 형식**:
```typescript
{
  content: [{
    type: "text",
    text: `## 🍽️ Today's Menu

### 🎲 Result: **부대찌개**!

> "Perfect for cold weather! 🍲"

---

*This choice has been saved to your date log.*`
  }]
}
```

#### 3.4.3 random_pick

**목적**: 범용 랜덤 선택

```typescript
{
  name: "random_pick",
  description: "Randomly pick one option from given choices. Use for any decision making.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      options: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        description: "Options to choose from"
      },
      context: {
        type: "string",
        description: "What this choice is for (for logging)"
      }
    },
    required: ["couple_id", "options"]
  }
}
```

#### 3.4.4 rock_paper_scissors

**목적**: 가위바위보 게임

```typescript
{
  name: "rock_paper_scissors",
  description: "Play rock-paper-scissors between the couple. Use when couple wants to play or decide something with RPS.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      },
      player1_choice: {
        type: "string",
        enum: ["rock", "paper", "scissors"],
        description: "First player's choice"
      },
      player2_choice: {
        type: "string",
        enum: ["rock", "paper", "scissors"],
        description: "Second player's choice"
      }
    },
    required: ["couple_id", "player1_choice", "player2_choice"]
  }
}
```

**응답 형식**:
```typescript
{
  content: [{
    type: "text",
    text: `## ✊✌️✋ Rock Paper Scissors!

### Results
| Player | Choice |
|--------|--------|
| 철수 | 🪨 Rock |
| 영희 | ✌️ Scissors |

### 🎉 Winner: **철수**!

---

### 📊 Overall Stats
| Player | Wins | Losses | Draws |
|--------|------|--------|-------|
| 철수 | 12 | 8 | 5 |
| 영희 | 8 | 12 | 5 |`
  }]
}
```

#### 3.4.5 get_game_stats

**목적**: 게임 통계 조회

```typescript
{
  name: "get_game_stats",
  description: "Get game statistics and history for the couple. Use when couple wants to see their game records.",
  inputSchema: {
    type: "object",
    properties: {
      couple_id: {
        type: "string",
        description: "Unique couple identifier"
      }
    },
    required: ["couple_id"]
  }
}
```

---

## 4. 데이터 모델

### 4.1 MongoDB Collections

#### 4.1.1 couples

```typescript
interface Couple {
  _id: ObjectId;
  couple_id: string;              // 고유 식별자 (UUID)
  kakao_user_ids: string[];       // 연결된 카카오 유저 ID들
  partner1_name: string;
  partner2_name: string;
  anniversary_date: Date;         // 사귄 날
  created_at: Date;
  updated_at: Date;
  settings: {
    timezone: string;             // default: "Asia/Seoul"
    language: string;             // default: "ko"
  };
}

// Indexes
- { couple_id: 1 } unique
- { kakao_user_ids: 1 }
- { anniversary_date: 1 }
```

#### 4.1.2 anniversaries

```typescript
interface Anniversary {
  _id: ObjectId;
  anniversary_id: string;
  couple_id: string;              // FK to couples
  name: string;                   // 기념일 이름
  date: Date;                     // 날짜
  yearly: boolean;                // 매년 반복 여부
  reminder_days: number[];        // 알림 (며칠 전) [14, 7, 3, 1]
  created_at: Date;
}

// Indexes
- { anniversary_id: 1 } unique
- { couple_id: 1, date: 1 }
```

#### 4.1.3 date_logs

```typescript
interface DateLog {
  _id: ObjectId;
  date_log_id: string;
  couple_id: string;              // FK to couples
  place: string;                  // 장소
  memo?: string;                  // 메모
  rating?: number;                // 만족도 (1-5)
  d_day: number;                  // 그 날의 D+day
  date: Date;                     // 데이트 날짜
  created_at: Date;
  metadata?: {
    location?: string;            // 위치 정보
    category?: string;            // 카테고리
  };
}

// Indexes
- { date_log_id: 1 } unique
- { couple_id: 1, date: -1 }
```

#### 4.1.4 game_logs

```typescript
interface GameLog {
  _id: ObjectId;
  game_log_id: string;
  couple_id: string;              // FK to couples
  type: "who_pays" | "rps" | "menu" | "random";
  result: {
    winner?: string;              // 승자 (있는 경우)
    picked?: string;              // 선택된 항목
    details?: Record<string, any>;
  };
  date: Date;
  created_at: Date;
}

// Indexes
- { game_log_id: 1 } unique
- { couple_id: 1, type: 1, date: -1 }
```

### 4.2 Aggregations

#### 게임 통계 조회

```typescript
// who_pays 통계
db.game_logs.aggregate([
  { $match: { couple_id: "xxx", type: "who_pays" } },
  { $group: {
    _id: "$result.winner",
    count: { $sum: 1 }
  }}
])

// RPS 통계
db.game_logs.aggregate([
  { $match: { couple_id: "xxx", type: "rps" } },
  { $group: {
    _id: "$result.winner",
    count: { $sum: 1 }
  }}
])
```

---

## 5. 서버 구현

### 5.1 진입점 (src/index.ts)

```typescript
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { connectDB } from "./db/connection.js";
import { registerTools } from "./tools/index.js";

const app = express();
app.use(express.json());

// MongoDB 연결
await connectDB();

// MCP 서버 생성
const mcpServer = new McpServer({
  name: "couple-mcp",
  version: "1.0.0"
});

// Tools 등록
registerTools(mcpServer);

// Session 관리
const sessions = new Map<string, StreamableHTTPServerTransport>();

// MCP 엔드포인트
app.all("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && sessions.has(sessionId)) {
    transport = sessions.get(sessionId)!;
  } else {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    transport.onSessionInitialized = (id) => {
      sessions.set(id, transport);
    };

    await mcpServer.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Couple MCP Server running on port ${PORT}`);
});
```

### 5.2 Tool 등록 (src/tools/index.ts)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Tool handlers
import { recommendDate } from "./date/recommendDate.js";
import { logDate } from "./date/logDate.js";
import { getDateHistory } from "./date/getDateHistory.js";
import { registerCouple } from "./anniversary/registerCouple.js";
import { addAnniversary } from "./anniversary/addAnniversary.js";
import { getUpcoming } from "./anniversary/getUpcoming.js";
import { suggestAnniversary } from "./anniversary/suggestAnniversary.js";
import { whoPays } from "./game/whoPays.js";
import { pickMenu } from "./game/pickMenu.js";
import { randomPick } from "./game/randomPick.js";
import { rockPaperScissors } from "./game/rockPaperScissors.js";
import { getGameStats } from "./game/getGameStats.js";

export function registerTools(server: McpServer) {

  // === Date Tools ===

  server.tool(
    "recommend_date",
    "Recommend date places or courses for couples based on location, mood, and budget",
    {
      couple_id: z.string(),
      type: z.enum(["place", "course"]).optional(),
      category: z.enum(["restaurant", "cafe", "activity", "all"]).optional(),
      location: z.string().optional(),
      mood: z.enum(["romantic", "active", "casual", "special"]).optional(),
      budget: z.number().optional()
    },
    recommendDate
  );

  server.tool(
    "log_date",
    "Save a date record for the couple",
    {
      couple_id: z.string(),
      place: z.string(),
      memo: z.string().optional(),
      rating: z.number().min(1).max(5).optional()
    },
    logDate
  );

  server.tool(
    "get_date_history",
    "Get past date records for the couple",
    {
      couple_id: z.string(),
      limit: z.number().default(10).optional()
    },
    getDateHistory
  );

  // === Anniversary Tools ===

  server.tool(
    "register_couple",
    "Register a new couple with their anniversary date",
    {
      kakao_user_id: z.string(),
      anniversary_date: z.string(),
      partner1_name: z.string().optional(),
      partner2_name: z.string().optional()
    },
    registerCouple
  );

  server.tool(
    "add_anniversary",
    "Add a custom anniversary or special date",
    {
      couple_id: z.string(),
      name: z.string(),
      date: z.string(),
      yearly: z.boolean().default(true).optional()
    },
    addAnniversary
  );

  server.tool(
    "get_upcoming",
    "Get current D+day count and upcoming anniversaries",
    {
      couple_id: z.string(),
      days_ahead: z.number().default(90).optional()
    },
    getUpcoming
  );

  server.tool(
    "suggest_anniversary",
    "Get gift and place suggestions for an anniversary",
    {
      couple_id: z.string(),
      anniversary_type: z.string(),
      budget: z.number().optional()
    },
    suggestAnniversary
  );

  // === Game Tools ===

  server.tool(
    "who_pays",
    "Randomly decide who pays for the meal/activity",
    {
      couple_id: z.string()
    },
    whoPays
  );

  server.tool(
    "pick_menu",
    "Randomly pick a menu/food category",
    {
      couple_id: z.string(),
      category: z.enum(["korean", "chinese", "japanese", "western", "all"]).optional(),
      exclude: z.array(z.string()).optional()
    },
    pickMenu
  );

  server.tool(
    "random_pick",
    "Randomly pick one option from given choices",
    {
      couple_id: z.string(),
      options: z.array(z.string()).min(2),
      context: z.string().optional()
    },
    randomPick
  );

  server.tool(
    "rock_paper_scissors",
    "Play rock-paper-scissors between the couple",
    {
      couple_id: z.string(),
      player1_choice: z.enum(["rock", "paper", "scissors"]),
      player2_choice: z.enum(["rock", "paper", "scissors"])
    },
    rockPaperScissors
  );

  server.tool(
    "get_game_stats",
    "Get game statistics and history for the couple",
    {
      couple_id: z.string()
    },
    getGameStats
  );
}
```

### 5.3 Tool Handler 예시 (src/tools/game/whoPays.ts)

```typescript
import { randomInt } from "crypto";
import { coupleRepository } from "../../db/repositories/coupleRepository.js";
import { gameLogRepository } from "../../db/repositories/gameLogRepository.js";

interface WhoPayParams {
  couple_id: string;
}

export async function whoPays({ couple_id }: WhoPayParams) {
  // 커플 정보 조회
  const couple = await coupleRepository.findById(couple_id);
  if (!couple) {
    return {
      content: [{
        type: "text" as const,
        text: "❌ Couple not found. Please register first using register_couple."
      }]
    };
  }

  // 랜덤 선택
  const partners = [couple.partner1_name, couple.partner2_name];
  const winnerIndex = randomInt(0, 2);
  const winner = partners[winnerIndex];

  // 기록 저장
  await gameLogRepository.create({
    couple_id,
    type: "who_pays",
    result: { winner }
  });

  // 통계 조회
  const stats = await gameLogRepository.getWhoPayStats(couple_id);

  // 응답 생성
  const response = `## 🎰 Who Pays?

### Result: **${winner}** pays today! 💸

---

### 📊 History
| Partner | Times Paid |
|---------|------------|
| ${couple.partner1_name} | ${stats[couple.partner1_name] || 0} |
| ${couple.partner2_name} | ${stats[couple.partner2_name] || 0} |

${getStreakMessage(winner, stats)}`;

  return {
    content: [{
      type: "text" as const,
      text: response
    }]
  };
}

function getStreakMessage(winner: string, stats: Record<string, number>): string {
  const entries = Object.entries(stats);
  if (entries.length < 2) return "";

  const [p1, p1Count] = entries[0];
  const [p2, p2Count] = entries[1];

  if (Math.abs(p1Count - p2Count) >= 5) {
    const loser = p1Count > p2Count ? p1 : p2;
    return `\n*${loser} is on a losing streak! 😅*`;
  }

  return "";
}
```

---

## 6. 외부 서비스 연동

### 6.1 카카오맵 API (src/services/kakaoMap.ts)

```typescript
import axios from "axios";

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const BASE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  road_address: string;
  phone: string;
  url: string;
  x: string;  // longitude
  y: string;  // latitude
}

interface SearchParams {
  query: string;
  category_group_code?: string;  // FD6: 음식점, CE7: 카페
  x?: string;
  y?: string;
  radius?: number;
  size?: number;
}

export async function searchPlaces(params: SearchParams): Promise<Place[]> {
  try {
    const response = await axios.get(BASE_URL, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`
      },
      params: {
        query: params.query,
        category_group_code: params.category_group_code,
        x: params.x,
        y: params.y,
        radius: params.radius || 5000,
        size: params.size || 5
      }
    });

    return response.data.documents.map((doc: any) => ({
      id: doc.id,
      name: doc.place_name,
      category: doc.category_name,
      address: doc.address_name,
      road_address: doc.road_address_name,
      phone: doc.phone,
      url: doc.place_url,
      x: doc.x,
      y: doc.y
    }));
  } catch (error) {
    console.error("Kakao Map API Error:", error);
    return [];
  }
}

// 카테고리 코드
export const CATEGORY_CODES = {
  RESTAURANT: "FD6",
  CAFE: "CE7",
  CULTURE: "CT1",
  TOUR: "AT4"
};
```

---

## 7. 배포

### 7.1 환경변수 (.env.example)

```env
# Server
PORT=3000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/couple_mcp

# Kakao API
KAKAO_REST_API_KEY=your_kakao_rest_api_key

# PlayMCP (Optional)
MCP_API_KEY=your_mcp_api_key
```

### 7.2 package.json

```json
{
  "name": "couple-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "lint": "eslint src/",
    "inspector": "npx @modelcontextprotocol/inspector node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.10.0",
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "zod": "^3.25.0",
    "axios": "^1.6.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.6.0",
    "vitest": "^1.0.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 7.3 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 7.4 Railway 배포

```yaml
# railway.json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

---

## 8. PlayMCP 등록

### 8.1 등록 절차

1. **서버 배포**: Railway/Render에 배포하여 HTTPS 엔드포인트 확보
   ```
   https://couple-mcp.up.railway.app/mcp
   ```

2. **PlayMCP 접속**: https://playmcp.kakao.com

3. **MCP 등록**:
   - Endpoint URL 입력
   - "정보 불러오기" 클릭 (ListingTools Operation)
   - Tool 정보 확인

4. **등록 방식 선택**:
   - **임시 등록**: 비공개 테스트용
   - **공개 등록**: 심사 후 공개

### 8.2 테스트 체크리스트

| 항목 | 확인 내용 |
|-----|---------|
| Tool Selection | "뭐 먹을까?" → pick_menu 선택 |
| Tool Selection | "오늘 누가 쏴?" → who_pays 선택 |
| Tool Selection | "사귄지 며칠?" → get_upcoming 선택 |
| Argument Binding | location 파라미터 정확히 바인딩 |
| Response Format | Markdown 렌더링 확인 |
| Error Handling | 잘못된 couple_id 에러 메시지 |

---

## 9. 개발 일정

### Phase 1: 기본 세팅 (1일)
- [ ] 프로젝트 초기화
- [ ] MCP 서버 보일러플레이트
- [ ] MongoDB 연결
- [ ] Express + StreamableHTTP Transport

### Phase 2: Game Tools (1일)
- [ ] who_pays 구현
- [ ] pick_menu 구현
- [ ] random_pick 구현
- [ ] rock_paper_scissors 구현
- [ ] get_game_stats 구현

### Phase 3: Anniversary Tools (1일)
- [ ] register_couple 구현
- [ ] add_anniversary 구현
- [ ] get_upcoming 구현
- [ ] suggest_anniversary 구현

### Phase 4: Date Tools (1일)
- [ ] 카카오맵 API 연동
- [ ] recommend_date 구현
- [ ] log_date 구현
- [ ] get_date_history 구현

### Phase 5: 배포 & 테스트 (1일)
- [ ] Railway/Render 배포
- [ ] PlayMCP 등록
- [ ] 카카오톡 실제 테스트
- [ ] 버그 수정

---

## 10. 참고 자료

- [카카오 PlayMCP 가이드](https://tech.kakao.com/posts/734)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP 공식 문서](https://modelcontextprotocol.io/)
- [카카오맵 API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)

---

*Last Updated: 2025-01-14*
*Version: 1.0.0*
