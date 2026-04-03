# Gamificación Fase 2: Sistema de Logros

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete achievement system that motivates couples through milestones, behaviors, consistency streaks, and combos—increasing engagement and relationship equilibrium.

**Architecture:** Centralized `achievementEngine` service detects achievement conditions after each event/task/transaction, unlocks achievements, and updates couple scores. Hybrid triggers: automatic background checks + manual verification endpoint. No breaking changes to existing APIs.

**Tech Stack:** TypeScript backend, Prisma ORM, React frontend with React Query, Tailwind CSS for achievements UI.

---

## System Overview

### Core Philosophy

Achievements drive behavior through:
1. **Hitos (Milestones)** - Point thresholds (50/250/500 pts cumulative)
2. **Comportamientos (Behaviors)** - Relationship health actions (pacifism, consensus, generosity)
3. **Racha (Streaks)** - Consistency over time (7-30 days without conflict)
4. **Combos** - Paired couple achievements (power duo, synchronization)

Each achievement has:
- **Rarity:** common → rare → epic → legendary
- **Point Reward:** +1 to +15 bonus points
- **Score Impact:** Increases CoupleScore dimensions (equilibrium/activity/consensus/constancy)

### 8-12 MVP Achievements

| ID | Name | Type | Rarity | Condition | Pts | Score Impact |
|----|------|------|--------|-----------|-----|--------------|
| 1 | Primeros pasos | Hito | Common | 50 cumulative pts | +2 | activity +1% |
| 2 | Centinela | Hito | Rare | 250 cumulative pts | +5 | activity +2% |
| 3 | Maestro de equilibrio | Hito | Epic | 500 cumulative pts | +10 | equilibrium +3% |
| 4 | Pacifista | Comportamiento | Common | 1 event accepted without negotiation | +1 | activity +1% |
| 5 | Consenso perfecto | Comportamiento | Rare | 5 events accepted consecutively (no disputes) | +3 | consensus +2% |
| 6 | Generoso | Comportamiento | Rare | Donated 50+ points to partner | +4 | equilibrium +2% |
| 7 | Semana tranquila | Racha | Rare | 7 days without task/event disputes | +3 | constancy +2% |
| 8 | Mes armonioso | Racha | Epic | 30 days without disputed task logs | +8 | constancy +3% |
| 9 | Power duo | Combo | Legendary | Both users unlocked 5+ achievements | +15 | all +5% |
| 10 | Sincronía perfecta | Combo | Epic | Perfect balance (0 pts diff) for 3 consecutive days | +10 | equilibrium +3% |
| 11 | Velocidad | Comportamiento | Rare | 10 tasks completed in 1 week | +4 | activity +2% |
| 12 | Confianza | Comportamiento | Rare | 20 task logs verified without disputes | +5 | consensus +2% |

### CoupleScore (Weekly Summary)

Table: `CoupleScore` (already exists in schema)

Fields:
- `coupleId`, `weekStartDate` (composite unique key)
- `user1Score`, `user2Score` - base points for the week
- `equilibrium` (0-100) - balance metric (0 = one person dominates, 100 = perfect balance)
- `activity` (0-100) - weekly engagement (events + tasks + points transactions)
- `consensus` (0-100) - conflict avoidance (% of events/tasks without dispute)
- `constancy` (0-100) - consistency streak (consecutive days of participation)

**How achievements impact:**
- Common unlock: +1% to `activity`
- Rare unlock: +2% to relevant dimension (`consensus`/`constancy`/`equilibrium`)
- Epic unlock: +3% + bonus points payout (+5-10 pts)
- Legendary unlock: +5% to all dimensions + large bonus (+15 pts)

Score recalculates:
- Every time an achievement unlocks (immediate)
- Nightly at 23:59 UTC for weekly summary (background job)

---

## Data Model

### New Tables (already in schema, need seed data)

**Achievement** (existing)
```prisma
model Achievement {
  id                String          @id @default(cuid())
  coupleId          String
  type              String          // "solo" | "couple"
  name              String
  description       String?
  rarity            String          // "common" | "rare" | "epic" | "legendary"
  pointsReward      Decimal
  coupleScore       Couple          @relation(fields: [coupleId], references: [id])
  userAchievements  UserAchievement[]
  createdAt         DateTime        @default(now())
}

model UserAchievement {
  id                String          @id @default(cuid())
  userId            String
  achievementId     String
  unlockedAt        DateTime        @default(now())
  user              User            @relation(fields: [userId], references: [id])
  achievement       Achievement     @relation(fields: [achievementId], references: [id])
  @@unique([userId, achievementId])
}
```

**CoupleScore** (existing, enhanced)
```prisma
model CoupleScore {
  id                String          @id @default(cuid())
  coupleId          String          @unique
  weekStartDate     DateTime
  user1Score       Int
  user2Score       Int
  equilibrium      Int             // 0-100
  activity         Int             // 0-100
  consensus        Int             // 0-100
  constancy        Int             // 0-100
  couple            Couple          @relation(fields: [coupleId], references: [id])
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
}
```

---

## Achievement Detection Logic

### Trigger 1: After Event Accept
**File:** `src/backend/src/routes/eventRoutes.ts`

When `POST /events/:id/accept` succeeds:
```typescript
// After event marked as accepted
await achievementEngine.checkAchievements(userId, coupleId, {
  type: 'event_accepted',
  eventId: id
})
```

Checks:
- Pacifista (no negotiations before accept)
- Consenso perfecto (count accepted without disputes)
- Punto hito (total points >= threshold)

### Trigger 2: After Task Log Verify
**File:** `src/backend/src/routes/taskRoutes.ts`

When `PUT /tasks/:taskId/logs/:logId` with `status: 'verified'` succeeds:
```typescript
// After task log verified
await achievementEngine.checkAchievements(userId, coupleId, {
  type: 'task_verified',
  taskLogId: logId
})
```

Checks:
- Confianza (count verified tasks)
- Velocidad (10 tasks in 1 week)

### Trigger 3: Manual Check
**File:** `src/backend/src/routes/achievementRoutes.ts`

Endpoint `POST /api/achievements/check` validates streak conditions:
```typescript
// Manual check for streak-based achievements
const newAchievements = await achievementEngine.checkAchievements(userId, coupleId, {
  type: 'manual_check'
})
```

Checks:
- Semana tranquila (7 days without disputes)
- Mes armonioso (30 days without disputed task logs)
- Sincronía perfecta (balance = 0 for 3 days)

### Trigger 4: Nightly Batch (Optional)
**File:** `src/backend/src/services/achievementEngine.ts`

Daily cron at 23:59 UTC validates streaks for all couples:
```typescript
// Called by scheduler/worker
await achievementEngine.validateAllStreaks()
```

Updates CoupleScore and triggers notifications for new streaks.

---

## API Endpoints

### GET /api/achievements
**Purpose:** Get all achievements for the couple (desbloqueados y futuros)

**Request:**
```
GET /api/achievements
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "achievements": [
    {
      "id": "ach_001",
      "name": "Primeros pasos",
      "description": "Reach 50 points",
      "rarity": "common",
      "pointsReward": 2,
      "unlockedAt": "2026-04-03T10:30:00Z",
      "unlockedBy": "user_001",
      "progress": null
    },
    {
      "id": "ach_002",
      "name": "Pacifista",
      "description": "Accept event without negotiation",
      "rarity": "common",
      "pointsReward": 1,
      "unlockedAt": null,
      "progress": {
        "current": 2,
        "target": 1,
        "percentage": 200
      }
    }
  ],
  "stats": {
    "unlocked": 3,
    "total": 12,
    "percentage": 25
  }
}
```

### GET /api/achievements/user
**Purpose:** Get current user's unlocked achievements (subset, focused view)

**Request:**
```
GET /api/achievements/user
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "achievements": [
    {
      "id": "ach_001",
      "name": "Primeros pasos",
      "rarity": "common",
      "pointsReward": 2,
      "unlockedAt": "2026-04-03T10:30:00Z"
    }
  ],
  "progress": {
    "unlocked": 1,
    "total": 12,
    "percentage": 8
  }
}
```

### POST /api/achievements/check
**Purpose:** Manually trigger achievement checks (for streaks, manual validation)

**Request:**
```json
POST /api/achievements/check
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Response:**
```json
{
  "success": true,
  "newAchievements": [
    {
      "id": "ach_007",
      "name": "Semana tranquila",
      "rarity": "rare",
      "pointsReward": 3,
      "unlockedAt": "2026-04-04T14:20:00Z",
      "message": "¡Desbloqueaste 'Semana tranquila'! +3 pts"
    }
  ],
  "totalUnlocked": 4
}
```

### GET /api/achievements/couple-score
**Purpose:** Get weekly CoupleScore (for dashboard sidebar)

**Request:**
```
GET /api/achievements/couple-score
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "coupleScore": {
    "weekStartDate": "2026-03-31T00:00:00Z",
    "user1Score": 145,
    "user2Score": 142,
    "equilibrium": 95,
    "activity": 78,
    "consensus": 92,
    "constancy": 88
  }
}
```

---

## Frontend Integration

### Dashboard Widget
**File:** `src/frontend/src/components/AchievementsWidget.tsx` (new)

Displays:
- Last 3 unlocked achievements (badge + name + +X pts)
- Next achievement to unlock (progress bar, e.g., "3/5 consensos")
- "Ver todos los logros →" button

On achievement unlock: Toast notification (celebrates, shows +pts)

### Achievements Page
**File:** `src/frontend/src/pages/Achievements.tsx` (new)

Displays:
- Grid of 12 achievement cards
- Unlocked: ✓ checkmark, color-coded rarity, +X pts earned
- Locked: % progress toward condition
- Sidebar: CoupleScore gauges (equilibrium, activity, consensus, constancy 0-100)
- Button: "Verificar mis logros" (POST /check endpoint)

### Integration with Existing Pages
- Dashboard: Add AchievementsWidget below PointsChart
- After Event Accept: Toast notification if achievement unlocked
- After Task Verify: Toast notification if achievement unlocked

---

## Error Handling

**Invalid token:**
```json
{
  "error": "Invalid or expired token",
  "status": 401
}
```

**Couple not found:**
```json
{
  "error": "Couple not found",
  "status": 404
}
```

**Achievement check failed (backend error):**
```json
{
  "error": "Failed to check achievements",
  "details": "Database connection error",
  "status": 500
}
```

---

## Testing Strategy

**Unit Tests:**
- `achievementEngine.checkPointMilestone()` - verifies 50/250/500 thresholds
- `achievementEngine.checkConsensusStreak()` - verifies 5 consecutive accepts
- `achievementEngine.calculateScoreImpact()` - verifies rarity → score % calc
- `achievementEngine.detectStreaks()` - verifies 7/30 day calculations

**Integration Tests:**
- End-to-end: Event accept → Achievement unlock → CoupleScore updated
- Manual check endpoint returns correct locked/unlocked state
- Notifications sent only for Rare+
- No duplicate unlocks

**Manual QA:**
- Create test couple, accept 5 events without dispute, verify "Consenso perfecto" unlocks
- Verify score gauges update on dashboard
- Verify toast notifications appear and disappear correctly
- Verify "Ver todos los logros" navigates correctly
- Test on mobile viewport

---

## Rollout Plan

**Phase 2a (Week 1):** Backend engine + API endpoints  
**Phase 2b (Week 2):** Frontend UI (widget + page) + integration  
**Phase 2c (Week 3):** Polish, testing, nightly batch job  

No database migrations required (tables already exist in schema).

---

## Future Enhancements (Not MVP)

- Leaderboard of couples by CoupleScore
- Achievement categories (filter by type)
- Social sharing ("We unlocked Power duo!")
- Seasonal achievements (e.g., "Valentine's harmony")
- Custom achievements for premium users
