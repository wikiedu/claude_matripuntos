# API Reference — Matripuntos

Base URL: `http://localhost:3000/api`  
Auth: `Authorization: Bearer <JWT>` en todas las rutas salvo donde se indica `[NO AUTH]`.

---

## AUTH — `/api/auth`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/register` | NO | `{ email, password, name, coupleSecretKey? }` | `{ token, user, couple }` |
| POST | `/login` | NO | `{ email, password }` | `{ token, user, couple }` |
| POST | `/invite` | YES | `{ inviteeEmail }` | `{ invitation }` |
| POST | `/join-couple` | YES | `{ token }` | `{ couple, user }` |

---

## EVENTS — `/api/events`

| Method | Path | Body / Query | Notes |
|--------|------|-------------|-------|
| GET | `/` | `?status=pending&limit=20` | List couple events |
| POST | `/` | `{ type, title?, description?, dateStart, dateEnd, hasChildren?, numChildren?, pointsBase, compensation?, compensationDiscount? }` | Creates event in `draft` status |
| GET | `/:id` | — | Includes negotiations array |
| PUT | `/:id` | Partial event fields | Only creator, only in draft/pending |
| DELETE | `/:id` | — | Only creator |
| POST | `/:id/accept` | — | Partner only. Sets `status=accepted`, creates PointsTransaction |
| POST | `/:id/reject` | — | Partner only. Sets `status=rejected` |
| POST | `/:id/counter` | `{ pointsProposed, message? }` | Counter-offer. Increments `negotiationRound`. Blocked if free rounds exhausted |
| POST | `/:id/force` | — | Proposer forces. Deducts from proposer's own balance |

**Event status flow:** `draft → pending → accepted | rejected | forced`

---

## TASKS — `/api/tasks`

| Method | Path | Body / Query | Notes |
|--------|------|-------------|-------|
| GET | `/` | — | List couple's tasks |
| POST | `/` | `{ name, category, pointsBase?, isDefault? }` | category: `cocina\|baños\|limpieza\|compra\|logistica\|cuidado\|mantenimiento\|jardineria\|mascotas` |
| PUT | `/:id` | Partial task fields | — |
| DELETE | `/:id` | — | — |
| GET | `/logs` | `?date=2026-04-01&userId=xxx` | List task logs |
| POST | `/logs` | `{ taskId, date, pointsBase, modifier?, modifierValue?, pointsFinal }` | Log completed task. Status = `pending` |
| PUT | `/logs/:id` | `{ status: 'verified' \| 'disputed' }` | Partner verifies or disputes |
| POST | `/logs/:id/dispute` | `{ reason }` | Opens dispute |

**TaskLog auto-accept:** After 24h without partner response → `status = verified` automatically.

---

## POINTS — `/api/points`

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/balance` | — | `{ user1: { name, balance }, user2: { name, balance }, net }` |
| GET | `/history` | `?limit=50&offset=0` | Array of PointsTransaction |
| GET | `/leaderboard` | `?period=week\|month` | Points earned per user in period |

---

## NEGOTIATIONS — `/api/negotiations`

| Method | Path | Response |
|--------|------|----------|
| GET | `/pending` | All events awaiting current user's response |

---

## NOTIFICATIONS — `/api/notifications`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/` | `?unread=true` | User's notifications |
| PUT | `/:id/read` | — | Mark single as read |
| PUT | `/read-all` | — | Mark all as read |

---

## CONFIGURATION — `/api/configuration`

| Method | Path | Body |
|--------|------|------|
| GET | `/` | — |
| PUT | `/` | `{ tasksConfig?, multipliersConfig?, activityTypes? }` (all JSON strings) |

---

## PROFILE — `/api/profile`

| Method | Path | Body |
|--------|------|------|
| GET | `/me` | — |
| PUT | `/me` | `{ surname?, profilePhotoUrl?, weeklyWorkHours?, workMode?, taskPreferencesLoves?, taskPreferencesDislikes? }` |

---

## FAMILY — `/api`

| Method | Path | Body |
|--------|------|------|
| GET | `/children` | — |
| POST | `/children` | `{ name, dateOfBirth, livesWithUser1?, livesWithUser2?, hasSpecialNeeds? }` |
| DELETE | `/children/:id` | — |
| GET | `/pets` | — |
| POST | `/pets` | `{ name, type, quantity? }` |
| DELETE | `/pets/:id` | — |

---

## CATEGORIES — `/api/categories`

| Method | Path | Body |
|--------|------|------|
| GET | `/` | — (includes subcategories) |
| POST | `/` | `{ name, emoji, type, basePoints?, description? }` |
| PUT | `/:id` | Partial fields |
| DELETE | `/:id` | — |

---

## ACHIEVEMENTS — `/api/achievements`

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | Couple achievements with unlock status |
| GET | `/user` | Current user's unlocked achievements |

---

## CALENDAR — `/api/calendar`

| Method | Path | Query / Body |
|--------|------|-------------|
| GET | `/` | `?month=4&year=2026` |
| POST | `/` | `{ type, title, date, relatedEventId?, relatedTaskId?, description?, color? }` |

---

## ANALYTICS — `/api/analytics`

| Method | Path | Response |
|--------|------|----------|
| GET | `/overview` | 30-day totals: events, tasks, points per user |
| GET | `/trends` | Weekly data array for charts |
| GET | `/equity` | `{ equilibrium, activity, consensus, constancy, overallScore }` |

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Validation error (Zod) — body has `error` with details |
| 401 | Missing or invalid JWT |
| 403 | Action not allowed (e.g. partner trying to accept own event) |
| 404 | Resource not found |
| 409 | Conflict (e.g. negotiation round limit reached) |
| 500 | Internal server error |
