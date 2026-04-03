# Modelo de Datos — Matripuntos

DB: SQLite (local `src/backend/prisma/dev.db`) → PostgreSQL/Supabase (producción)  
ORM: Prisma. Schema completo: `src/backend/prisma/schema.prisma`

---

## Relaciones Principales

```
Couple (1) ──< User (2 máx)
Couple (1) ──< Event
Couple (1) ──< Task ──< TaskLog
Event (1) ──< Negotiation
Event (1) ── PointsTransaction (1)
TaskLog (1) ── PointsTransaction (1)
Couple (1) ── Configuration (1)
Couple (1) ── Subscription (1)
```

---

## Modelos Core

### Couple
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| secretKey | String unique | Para que partner se una |
| numChildren | Int | Default 0 |
| language | String | Default "es" |

### User
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| coupleId | String | FK → Couple |
| email | String unique | — |
| passwordHash | String | bcrypt |
| name | String | — |
| roleInHome | String | Default "equal" |
| hasCompletedOnboarding | Boolean | Default false |

### Event
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| coupleId | String | FK → Couple |
| createdBy | String? | FK → User |
| type | String | cena, viaje, despedida, etc. |
| dateStart / dateEnd | DateTime | — |
| numChildren | Int | Hijos presentes durante la ausencia |
| pointsBase | Decimal | Valor tabla base |
| pointsCalculated | Decimal | Tras aplicar multiplicadores |
| pointsAgreed | Decimal? | Valor acordado en negociación |
| status | String | draft→pending→accepted/rejected/forced |
| negotiationRound | Int | Ronda actual |
| maxFreeRounds | Int | Default 2 |
| lastProposedBy | String? | userId |
| lastProposedPoints | Decimal? | — |
| negotiationHistory | String | JSON array de rondas |
| compensation | String? | Descripción compensación |
| compensationDiscount | Decimal | Multiplicador (default 1.0 = sin descuento) |

### Task
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| coupleId | String | FK → Couple |
| name | String | — |
| category | String | cocina/baños/limpieza/compra/logistica/cuidado/mantenimiento/jardineria/mascotas |
| pointsBase | Decimal | Default 1.0 |
| isDefault | Boolean | true = tarea predefinida del sistema |

### TaskLog
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| coupleId / taskId / completedBy | String | FKs |
| date | DateTime | Día de la tarea |
| pointsBase / modifier? / modifierValue / pointsFinal | Decimal | — |
| status | String | pending→verified/disputed |
| verifiedBy / verifiedAt | String? / DateTime? | Partner que verifica |
| disputeReason / disputedAt | String? / DateTime? | — |

### Negotiation
| Campo | Tipo | Notas |
|-------|------|-------|
| eventId | String | FK → Event |
| roundNumber | Int | 1, 2, 3... |
| proposedBy | String? | userId |
| pointsProposed | Decimal | — |
| message | String? | Justificación |
| responseType | String? | accepted/rejected/counter_proposed/awaiting/forced |
| respondedBy / respondedAt | String? / DateTime? | — |

### PointsTransaction
| Campo | Tipo | Notas |
|-------|------|-------|
| coupleId / userId? | String | FKs |
| type | String | event_accepted/task_completed/donation/forced_payment |
| amount | Decimal | Positivo = ganados, negativo = pagados |
| relatedEventId / relatedTaskLogId | String? unique | FK al origen |

### Configuration
| Campo | Tipo | Notas |
|-------|------|-------|
| coupleId | String unique | FK → Couple |
| tasksConfig | String | JSON: lista de tareas y sus puntos |
| multipliersConfig | String | JSON: factores personalizados |
| activityTypes | String | JSON: tipos de actividad y sus bases |

---

## Modelos V2 (Extended)

| Modelo | FK | Campos clave |
|--------|-----|-------------|
| UserProfile | userId unique | surname, profilePhotoUrl, weeklyWorkHours, workMode, taskPreferencesLoves(JSON), taskPreferencesDislikes(JSON) |
| CoupleProfile | coupleId unique | homeType, homeSizeM2, externalServices(JSON) |
| Child | coupleId | name, dateOfBirth, livesWithUser1/2, hasSpecialNeeds |
| Pet | coupleId | name, type, quantity |
| Invitation | coupleId+inviterUserId | inviteeEmail, token(unique), status(pending/accepted/rejected), expiresAt |
| Category | coupleId | name, emoji, type(event/chore/service), basePoints, isCustom, isActive → has Subcategory[] |
| Subcategory | categoryId | name, basePointsModifier |
| Achievement | coupleId | type(solo/couple), name, rarity(common/rare/epic/legendary), condition(JSON) |
| UserAchievement | userId+achievementId (unique) | unlockedAt |
| CoupleScore | coupleId+weekStartDate (unique) | user1Score, user2Score, overallScore, equilibrium, activity, consensus, constancy |
| CalendarEntry | coupleId | type(event/task/service/birthday/holiday), title, date, relatedEventId?, relatedTaskId? |

---

## Nota sobre JSON en SQLite

Los campos de tipo JSON (negotiationHistory, tasksConfig, multipliersConfig, activityTypes, taskPreferencesLoves, etc.) se almacenan como **strings JSON** en SQLite. Usar `JSON.parse()` / `JSON.stringify()` al leer/escribir en el backend.
