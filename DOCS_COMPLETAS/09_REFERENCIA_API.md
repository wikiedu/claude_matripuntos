# 📡 REFERENCIA COMPLETA DE API - MATRIPUNTOS

Este documento lista todos los endpoints disponibles con parámetros, respuestas, y ejemplos.

---

## BASE URL

```
Desarrollo: http://localhost:3000
Producción: https://matripuntos-production-xxxx.up.railway.app
```

## Autenticación

Todos los endpoints excepto `/auth/signup` y `/auth/login` requieren JWT token:

```
Authorization: Bearer <token>
```

El token se obtiene en signup/login y dura **7 días**.

---

## ENDPOINTS

## 1. AUTENTICACIÓN (`/api/auth`)

### 1.1 POST /api/auth/signup
**Descripción:** Crear cuenta de pareja

**Request:**
```json
{
  "email1": "alice@example.com",
  "password1": "SecurePassword123!",
  "name1": "Alice",
  "email2": "bob@example.com",
  "password2": "SecurePassword456!",
  "name2": "Bob",
  "childrenCount": 2
}
```

**Validaciones:**
- `email1`, `email2`: formato email, únicos, diferentes
- `password1`, `password2`: mínimo 8 chars, debe contener número o símbolo
- `name1`, `name2`: 1-50 caracteres
- `childrenCount`: 0-10 (opcional, default 0)

**Response (201 Created):**
```json
{
  "couple": {
    "id": "uuid-couple-id",
    "name": "Alice & Bob",
    "users": [
      {
        "id": "uuid-user1-id",
        "email": "alice@example.com",
        "name": "Alice",
        "coupleId": "uuid-couple-id"
      },
      {
        "id": "uuid-user2-id",
        "email": "bob@example.com",
        "name": "Bob",
        "coupleId": "uuid-couple-id"
      }
    ],
    "childrenCount": 2,
    "createdAt": "2026-04-02T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-user1-id",
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

**Errores:**
```json
// 400 - Email ya registrado
{ "error": "El email ya está registrado" }

// 400 - Contraseña débil
{ "error": "Contraseña muy débil (mín 8 chars, debe incluir número o símbolo)" }

// 400 - Validación
{ "errors": [{ "path": ["email1"], "message": "Invalid email" }] }
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email1": "alice@test.com",
    "password1": "Test123!",
    "name1": "Alice",
    "email2": "bob@test.com",
    "password2": "Test456!",
    "name2": "Bob",
    "childrenCount": 2
  }'
```

---

### 1.2 POST /api/auth/login
**Descripción:** Iniciar sesión

**Request:**
```json
{
  "email": "alice@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-user-id",
    "email": "alice@example.com",
    "name": "Alice",
    "coupleId": "uuid-couple-id"
  },
  "couple": {
    "id": "uuid-couple-id",
    "name": "Alice & Bob",
    "users": [...],
    "childrenCount": 2
  }
}
```

**Errores:**
```json
// 401
{ "error": "Email o contraseña incorrectos" }

// 404
{ "error": "El usuario no existe" }
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "Test123!"
  }'
```

---

### 1.3 GET /api/auth/me
**Descripción:** Obtener usuario actual

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid-user-id",
  "email": "alice@example.com",
  "name": "Alice",
  "coupleId": "uuid-couple-id",
  "couple": {
    "id": "uuid-couple-id",
    "name": "Alice & Bob",
    "users": [...]
  }
}
```

**Errores:**
```json
// 401 - Token inválido/expirado
{ "error": "Invalid or expired token" }
```

**cURL:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

### 1.4 GET /api/auth/couple
**Descripción:** Obtener datos de la pareja

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid-couple-id",
  "name": "Alice & Bob",
  "users": [
    {
      "id": "uuid-user1-id",
      "email": "alice@example.com",
      "name": "Alice"
    },
    {
      "id": "uuid-user2-id",
      "email": "bob@example.com",
      "name": "Bob"
    }
  ],
  "childrenCount": 2,
  "configuration": {
    "id": "uuid-config-id",
    "childrenCount": 2,
    "coolingPoints": 2.0,
    "cleaningPoints": 1.5,
    "shoppingPoints": 1.5
  }
}
```

**cURL:**
```bash
curl http://localhost:3000/api/auth/couple \
  -H "Authorization: Bearer $TOKEN"
```

---

## 2. EVENTOS (`/api/events`)

### 2.1 POST /api/events
**Descripción:** Crear nueva solicitud de actividad

**Request:**
```json
{
  "type": "dinner",
  "startDate": "2026-04-10T21:30:00Z",
  "endDate": "2026-04-10T23:30:00Z",
  "description": "Cena con amigos de la universidad",
  "hasChildren": true,
  "proposedPoints": 19.5,
  "compensationId": null
}
```

**Parámetros:**
- `type`: "dinner" | "travel_day" | "travel_weekend" | "sport" | "medical" | "other"
- `startDate`, `endDate`: ISO 8601 format (timestamp válido)
- `description`: 5-200 caracteres
- `hasChildren`: boolean
- `proposedPoints`: 1-200
- `compensationId`: uuid (opcional)

**Response (201 Created):**
```json
{
  "event": {
    "id": "uuid-event-id",
    "coupleId": "uuid-couple-id",
    "type": "dinner",
    "startDate": "2026-04-10T21:30:00Z",
    "endDate": "2026-04-10T23:30:00Z",
    "description": "Cena con amigos de la universidad",
    "hasChildren": true,
    "status": "pending",
    "createdBy": "uuid-user-id",
    "createdAt": "2026-04-02T10:30:00Z"
  },
  "negotiation": {
    "id": "uuid-negotiation-id",
    "eventId": "uuid-event-id",
    "proposerId": "uuid-user-id",
    "responderId": "uuid-other-user-id",
    "status": "pending",
    "proposedPoints": 19.5,
    "currentRound": 1,
    "maxRounds": 2
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dinner",
    "startDate": "2026-04-10T21:30:00Z",
    "endDate": "2026-04-10T23:30:00Z",
    "description": "Cena con amigos",
    "hasChildren": true,
    "proposedPoints": 19.5
  }'
```

---

### 2.2 GET /api/events
**Descripción:** Listar todos los eventos de la pareja

**Query Parameters:**
- `status`: "pending" | "accepted" | "rejected" | "forced" (opcional)
- `type`: "dinner" | "travel_day" | etc. (opcional)
- `limit`: número (default 50)
- `offset`: número (default 0)

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "uuid-event-id",
      "type": "dinner",
      "startDate": "2026-04-10T21:30:00Z",
      "endDate": "2026-04-10T23:30:00Z",
      "description": "Cena con amigos",
      "hasChildren": true,
      "status": "pending",
      "createdBy": "uuid-user-id",
      "negotiations": [
        {
          "id": "uuid-negotiation-id",
          "status": "pending",
          "proposedPoints": 19.5,
          "currentRound": 1
        }
      ]
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

**cURL:**
```bash
# Todos los eventos
curl "http://localhost:3000/api/events" \
  -H "Authorization: Bearer $TOKEN"

# Solo pending
curl "http://localhost:3000/api/events?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2.3 GET /api/events/:id
**Descripción:** Obtener detalle de evento

**Response (200 OK):**
```json
{
  "id": "uuid-event-id",
  "coupleId": "uuid-couple-id",
  "type": "dinner",
  "startDate": "2026-04-10T21:30:00Z",
  "endDate": "2026-04-10T23:30:00Z",
  "description": "Cena con amigos",
  "hasChildren": true,
  "status": "pending",
  "createdBy": "uuid-user-id",
  "creator": {
    "id": "uuid-user-id",
    "name": "Alice",
    "email": "alice@example.com"
  },
  "negotiations": [
    {
      "id": "uuid-negotiation-id",
      "proposerId": "uuid-user-id",
      "responderId": "uuid-other-user-id",
      "status": "pending",
      "proposedPoints": 19.5,
      "currentRound": 1,
      "maxRounds": 2,
      "rounds": [
        {
          "id": "uuid-round-id",
          "type": "initial",
          "proposedPoints": 19.5,
          "comment": null,
          "createdAt": "2026-04-02T10:30:00Z"
        }
      ]
    }
  ]
}
```

**cURL:**
```bash
curl "http://localhost:3000/api/events/uuid-event-id" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2.4 PUT /api/events/:id
**Descripción:** Actualizar evento (solo creator, si status=pending)

**Request:**
```json
{
  "description": "Cena con amigos y familia"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-event-id",
  "description": "Cena con amigos y familia",
  "updatedAt": "2026-04-02T11:00:00Z"
}
```

**Errores:**
```json
// 403 - Solo creator puede actualizar
{ "error": "Only creator can update event" }

// 400 - No puede actualizar si no está pending
{ "error": "Cannot update event with status: accepted" }
```

---

### 2.5 DELETE /api/events/:id
**Descripción:** Eliminar evento (solo creator, si status=pending)

**Response (204 No Content)**

**Errores:**
```json
// 403 - Solo creator
{ "error": "Only creator can delete event" }

// 400 - Solo pending events
{ "error": "Cannot delete accepted event" }
```

---

## 3. NEGOCIACIONES (`/api/negotiations`)

### 3.1 PUT /api/negotiations/:id/respond
**Descripción:** Responder a negociación (aceptar, rechazar, contra-proponer)

**Request:**
```json
{
  "action": "counter",
  "proposedPoints": 17.5,
  "comment": "Creo que deberían ser 17.5 porque es viernes y tú duermes más"
}
```

**Parámetros:**
- `action`: "accept" | "reject" | "counter"
- Si `action == "counter"`: incluir `proposedPoints` y opcionalmente `comment`
- Si `action == "reject"`: opcionalmente incluir `comment`

**Response (200 OK):**
```json
{
  "id": "uuid-negotiation-id",
  "status": "pending",
  "proposedPoints": 19.5,
  "currentRound": 2,
  "maxRounds": 2,
  "rounds": [
    {
      "type": "initial",
      "proposedPoints": 19.5,
      "comment": null
    },
    {
      "type": "counter",
      "proposedPoints": 17.5,
      "comment": "Creo que deberían ser 17.5..."
    }
  ],
  "nextAction": "propose_counter_or_accept"
}
```

**Errores:**
```json
// 400 - Ronda agotada (PREMIUM required)
{ "error": "No more free rounds. Subscribe to Premium for unlimited rounds." }

// 400 - No es respondedor
{ "error": "Only respondent can respond to negotiation" }
```

**cURL:**
```bash
curl -X PUT http://localhost:3000/api/negotiations/uuid-negotiation-id/respond \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "counter",
    "proposedPoints": 17.5,
    "comment": "Creo que es más justo así"
  }'
```

---

### 3.2 GET /api/negotiations/event/:eventId
**Descripción:** Obtener historial de negociación de un evento

**Response (200 OK):**
```json
{
  "negotiations": [
    {
      "id": "uuid-negotiation-id",
      "eventId": "uuid-event-id",
      "proposerId": "uuid-user-id",
      "proposer": { "id": "uuid-user-id", "name": "Juan" },
      "responderId": "uuid-other-user-id",
      "responder": { "id": "uuid-other-user-id", "name": "María" },
      "status": "pending",
      "proposedPoints": 19.5,
      "currentRound": 1,
      "maxRounds": 2,
      "rounds": [...]
    }
  ]
}
```

---

### 3.3 POST /api/negotiations/:id/force
**Descripción:** Forzar acuerdo usando matripuntos acumulados

**Request:**
```json
{
  "pointsToUse": 19.5
}
```

**Response (200 OK):**
```json
{
  "negotiation": {
    "id": "uuid-negotiation-id",
    "status": "forced",
    "proposedPoints": 19.5,
    "agreedPoints": 19.5
  },
  "transaction": {
    "id": "uuid-transaction-id",
    "fromUserId": "uuid-user-id",
    "toUserId": "uuid-other-user-id",
    "points": 19.5,
    "reason": "force_used"
  },
  "newBalance": 15.5
}
```

**Errores:**
```json
// 400 - Saldo insuficiente
{ "error": "Insufficient matripuntos. Need 19.5, have 10.0" }

// 403 - Solo proposer puede forzar
{ "error": "Only proposer can force negotiation" }
```

---

## 4. TAREAS (`/api/tasks`)

### 4.1 POST /api/tasks
**Descripción:** Crear tarea recurrente

**Request:**
```json
{
  "name": "Cocina",
  "type": "cooking",
  "basePoints": 2.0,
  "assignedTo": "uuid-user-id",
  "frequency": "daily",
  "description": "Comida principal del día"
}
```

**Response (201 Created):**
```json
{
  "task": {
    "id": "uuid-task-id",
    "coupleId": "uuid-couple-id",
    "name": "Cocina",
    "type": "cooking",
    "basePoints": 2.0,
    "assignedTo": "uuid-user-id",
    "frequency": "daily",
    "status": "active"
  },
  "logs": [
    {
      "id": "uuid-log-id",
      "date": "2026-04-02",
      "status": "pending"
    }
  ]
}
```

---

### 4.2 POST /api/tasks/:taskId/log
**Descripción:** Registrar completación de tarea

**Request:**
```json
{
  "date": "2026-04-02",
  "notes": "Cocinamos pasta con salsa"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-log-id",
  "taskId": "uuid-task-id",
  "date": "2026-04-02",
  "completedBy": "uuid-user-id",
  "status": "pending_verification",
  "pointsAwarded": null,
  "notes": "Cocinamos pasta con salsa"
}
```

---

### 4.3 PUT /api/tasks/:taskId/logs/:logId/verify
**Descripción:** Verificar/confirmar tarea completada

**Request:**
```json
{
  "action": "accept",
  "pointsAdjustment": 0
}
```

**Parámetros:**
- `action`: "accept" | "dispute"
- `pointsAdjustment`: número (si es negativo, resta de los puntos)

**Response (200 OK):**
```json
{
  "id": "uuid-log-id",
  "taskId": "uuid-task-id",
  "status": "verified",
  "pointsAwarded": 3.6,
  "transaction": {
    "id": "uuid-transaction-id",
    "fromUserId": "uuid-respondent",
    "toUserId": "uuid-completer",
    "points": 3.6
  }
}
```

---

### 4.4 PUT /api/tasks/:taskId/logs/:logId/dispute
**Descripción:** Disputar puntos de tarea

**Request:**
```json
{
  "proposedPoints": 2.5,
  "reason": "No fue comida completa, fue reheating"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-log-id",
  "status": "disputed",
  "proposedPoints": 2.5,
  "reason": "No fue comida completa, fue reheating"
}
```

---

## 5. CONFIGURACIÓN (`/api/configuration`)

### 5.1 GET /api/configuration
**Descripción:** Obtener configuración de pareja

**Response (200 OK):**
```json
{
  "id": "uuid-config-id",
  "coupleId": "uuid-couple-id",
  "childrenCount": 2,
  "cookingPoints": 2.0,
  "cleaningPoints": 1.5,
  "shoppingPoints": 1.5,
  "maxCompensation": 0.3,
  "maxPointsPerEvent": 200,
  "freeRoundsPerEvent": 2
}
```

---

### 5.2 PUT /api/configuration
**Descripción:** Actualizar configuración

**Request:**
```json
{
  "childrenCount": 3,
  "cookingPoints": 2.5
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-config-id",
  "childrenCount": 3,
  "cookingPoints": 2.5,
  "updatedAt": "2026-04-02T11:30:00Z"
}
```

---

## 6. PUNTOS TRANSACCIONES

### 6.1 GET /api/points/transactions
**Descripción:** Obtener historial de transacciones de puntos

**Query Parameters:**
- `days`: número (últimos N días, default 30)
- `limit`: número (default 50)
- `userId`: uuid (filtrar por usuario, opcional)

**Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "uuid-transaction-id",
      "fromUserId": "uuid-user1",
      "toUserId": "uuid-user2",
      "points": 19.5,
      "reason": "event_accepted",
      "eventId": "uuid-event-id",
      "createdAt": "2026-04-02T10:30:00Z"
    }
  ],
  "balance": {
    "userId": "uuid-user-id",
    "balance": 15.5,
    "lastUpdated": "2026-04-02T11:30:00Z"
  }
}
```

---

### 6.2 GET /api/points/balance
**Descripción:** Obtener saldo actual de puntos

**Response (200 OK):**
```json
{
  "currentUser": {
    "userId": "uuid-user-id",
    "balance": 15.5,
    "positiveUser": "uuid-user-id",
    "negativeUser": "uuid-other-user-id"
  },
  "partner": {
    "userId": "uuid-other-user-id",
    "balance": -15.5
  },
  "lastUpdated": "2026-04-02T11:30:00Z"
}
```

---

## CÓDIGOS DE ERROR

```
200 OK              - Solicitud exitosa
201 Created         - Recurso creado
204 No Content      - Recurso eliminado/actualizado sin respuesta

400 Bad Request     - Parámetros inválidos
401 Unauthorized    - Token inválido o expirado
403 Forbidden       - No tienes permisos
404 Not Found       - Recurso no existe
422 Unprocessable   - Validación falló
429 Too Many        - Rate limit excedido
500 Server Error    - Error del servidor
```

---

## AUTENTICACIÓN CON TOKEN

```bash
# 1. Obtener token (login)
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"Test123!"}' \
  | jq -r '.token')

# 2. Guardar en variable
echo "Token: $TOKEN"

# 3. Usar en requests
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 4. Token expira en 7 días
# Pasado eso, vuelve a hacer login
```

---

## RATE LIMITING

```
Sin rate limiting en MVP
(Agregar en V1.1 con Redis)
```

---

## NOTAS IMPORTANTES

1. **Timestamps**: Siempre en ISO 8601 format (UTC)
2. **IDs**: UUID v4
3. **Decimales**: Puntos redondeados a 0.5 (1.0, 1.5, 2.0, etc.)
4. **JWT**: Válido 7 días, se almacena en localStorage
5. **CORS**: Configurado para `http://localhost:5173` en dev

---

**Próximo documento: `10_DICCIONARIO_TERMINOS.md`**

Allí encontrarás definiciones de términos técnicos y del negocio.
