# 🧪 FASE 3 TESTING GUIDE — NEGOCIACIÓN MEJORADA

**Duración estimada:** 30-45 minutos
**Requisito:** FASE 1-2 completadas y funcionando
**Herramientas:** curl, Postman, o navegador

---

## 🎯 OBJETIVOS DE TESTING

- ✅ Verificar flujo propuesta → aceptado
- ✅ Verificar contra-propuesta (ronda 2)
- ✅ Verificar rechazos
- ✅ Verificar opción "hablamos en persona"
- ✅ Verificar notificaciones
- ✅ Verificar historial
- ✅ Verificar validaciones de seguridad

---

## 📋 SETUP PREVIO

### 1. Tener 2 usuarios registrados (pareja)

```bash
# Terminal 1: Backend
cd src/backend && npm run dev
# Output: 🚀 Matripuntos backend running on http://localhost:3000

# Terminal 2: Frontend
cd src/frontend && npm run dev
# Output: http://localhost:5173
```

### 2. Hacer login con ambos usuarios
- User A: email1@test.com / password1
- User B: email2@test.com / password2
- Ambos deben estar en el mismo couple

### 3. Obtener tokens

```bash
# Para User A
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email1@test.com",
    "password": "password1"
  }'

# Response:
{
  "token": "eyJhbGc...",
  "user": { "id": "user-a-id", "name": "User A" }
}

# Guardar token como TOKEN_A

# Para User B (en otra terminal o con otra sesión)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email2@test.com",
    "password": "password2"
  }'

# Guardar token como TOKEN_B
```

### 4. Crear un evento como User A

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dinner",
    "title": "Cena romántica",
    "description": "Cena especial el sábado",
    "dateStart": "2026-04-05T20:00:00",
    "dateEnd": "2026-04-05T23:00:00",
    "pointsBase": 15
  }'

# Response incluye: "id": "event-id"
# Guardar como EVENT_ID
```

---

## 🧪 TEST 1: FLUJO BÁSICO (Aceptar)

### Paso 1: User A propone evento

```bash
curl -X POST http://localhost:3000/api/events/$EVENT_ID/propose \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Te parece bien para el sábado?"
  }'

# Expected Response:
{
  "success": true,
  "event": {
    "id": "$EVENT_ID",
    "status": "proposed",
    "currentNegotiationRound": 1,
    "lastProposedBy": "user-a-id",
    "lastProposedPoints": 28
  },
  "message": "Event proposal sent to partner"
}
```

✅ **Verificar:**
- `status` cambió a `proposed`
- `currentNegotiationRound` es 1
- `lastProposedPoints` tiene valor (calculado con multiplicadores)

### Paso 2: Obtener estado de negociación (User B)

```bash
curl -X GET http://localhost:3000/api/events/$EVENT_ID/negotiation \
  -H "Authorization: Bearer $TOKEN_B"

# Expected Response:
{
  "success": true,
  "eventId": "$EVENT_ID",
  "status": {
    "status": "proposed",
    "currentRound": 1,
    "maxRounds": 2,
    "proposedPoints": 28,
    "agreedPoints": null,
    "canCounterPropose": true,
    "isFinalized": false,
    "negotiationHistory": [...]
  },
  "participants": {
    "creator": { "id": "user-a-id", "name": "User A" },
    "partner": { "id": "user-b-id", "name": "User B" }
  }
}
```

✅ **Verificar:**
- `status.status` es `proposed`
- `status.currentRound` es 1
- `status.proposedPoints` es 28
- `status.canCounterPropose` es `true`
- `status.isFinalized` es `false`

### Paso 3: User B acepta propuesta

```bash
curl -X POST http://localhost:3000/api/events/$EVENT_ID/respond \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "accept"
  }'

# Expected Response:
{
  "success": true,
  "event": {
    "id": "$EVENT_ID",
    "status": "accepted",
    "pointsAgreed": 28
  },
  "message": "Event proposal accept"
}
```

✅ **Verificar:**
- `status` cambió a `accepted`
- `pointsAgreed` tiene valor (28)
- No hay más cambios posibles

### Paso 4: Verificar estado final

```bash
curl -X GET http://localhost:3000/api/events/$EVENT_ID/negotiation \
  -H "Authorization: Bearer $TOKEN_B"

# Expected Response:
{
  "status": {
    "status": "accepted",
    "currentRound": 1,
    "agreedPoints": 28,
    "isFinalized": true,
    "canCounterPropose": false
  }
}
```

✅ **Verificar:**
- `status.isFinalized` es `true`
- `status.canCounterPropose` es `false`

---

## 🧪 TEST 2: CONTRA-PROPUESTA (Ronda 2)

### Setup: Crear nuevo evento como User A

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "trip",
    "title": "Viaje a la playa",
    "dateStart": "2026-04-12T08:00:00",
    "dateEnd": "2026-04-14T22:00:00",
    "pointsBase": 50
  }'

# Guardar como EVENT_ID_2
```

### Paso 1: User A propone

```bash
curl -X POST http://localhost:3000/api/events/$EVENT_ID_2/propose \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{ "message": "¿Viaje a la playa este fin de semana?" }'
```

✅ Esperar: status = proposed, round = 1

### Paso 2: User B hace contra-propuesta

```bash
curl -X POST http://localhost:3000/api/events/$EVENT_ID_2/respond \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "counter_propose",
    "pointsProposed": 65,
    "message": "Es mucho esfuerzo, ¿65 puntos sería justo?"
  }'

# Expected Response:
{
  "success": true,
  "event": {
    "id": "$EVENT_ID_2",
    "status": "counter_proposal",
    "currentNegotiationRound": 2,
    "lastProposedPoints": 65
  },
  "message": "Event proposal counter_propose"
}
```

✅ **Verificar:**
- `status` cambió a `counter_proposal`
- `currentNegotiationRound` es 2
- `lastProposedPoints` es 65

### Paso 3: Verificar que NO se puede hacer 3ª ronda

```bash
# Intentar otra contra-propuesta como User A
curl -X POST http://localhost:3000/api/events/$EVENT_ID_2/respond \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "counter_propose",
    "pointsProposed": 70
  }'

# Expected Error:
{
  "error": "Maximum 2 negotiation rounds allowed"
}
```

✅ **Verificar:** Error de máximo 2 rondas

### Paso 4: User A acepta contra-propuesta

```bash
curl -X POST http://localhost:3000/api/events/$EVENT_ID_2/respond \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{ "action": "accept" }'

# Expected Response:
{
  "event": {
    "status": "accepted",
    "pointsAgreed": 65
  }
}
```

✅ **Verificar:**
- `status` = accepted
- `pointsAgreed` = 65 (la nueva propuesta)

### Paso 5: Obtener historial completo

```bash
curl -X GET http://localhost:3000/api/events/$EVENT_ID_2/negotiation/history \
  -H "Authorization: Bearer $TOKEN_A"

# Expected Response:
{
  "success": true,
  "eventId": "$EVENT_ID_2",
  "eventTitle": "Viaje a la playa",
  "eventStatus": "accepted",
  "negotiations": [
    {
      "roundNumber": 1,
      "proposedBy": "user-a-id",
      "pointsProposed": 50,
      "message": "¿Viaje a la playa este fin de semana?"
    },
    {
      "roundNumber": 2,
      "proposedBy": "user-b-id",
      "pointsProposed": 65,
      "responseType": "counter_proposed",
      "message": "Es mucho esfuerzo, ¿65 puntos sería justo?"
    },
    {
      "roundNumber": 2,
      "respondedBy": "user-a-id",
      "responseType": "accepted"
    }
  ],
  "totalRounds": 2
}
```

✅ **Verificar:** Todas las rondas están registradas

---

## 🧪 TEST 3: RECHAZO

### Setup: Crear nuevo evento

```bash
# EVENT_ID_3
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "chore",
    "title": "Limpiar toda la casa",
    "pointsBase": 100
  }'
```

### Test: User A propone, User B rechaza

```bash
# 1. Proponer
curl -X POST http://localhost:3000/api/events/$EVENT_ID_3/propose \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{ "message": "Necesito ayuda" }'

# 2. Rechazar
curl -X POST http://localhost:3000/api/events/$EVENT_ID_3/respond \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject",
    "message": "Es mucho para este fin de semana"
  }'

# Expected Response:
{
  "event": {
    "status": "rejected"
  }
}
```

✅ **Verificar:**
- `status` = rejected
- `pointsAgreed` = null (no hay acuerdo)

---

## 🧪 TEST 4: CONVERSACIÓN PENDIENTE

### Setup: Crear nuevo evento

```bash
# EVENT_ID_4
```

### Test: User B marca como "pendiente conversación"

```bash
# 1. Proponer
curl -X POST http://localhost:3000/api/events/$EVENT_ID_4/propose \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{ "message": "Evento complejo" }'

# 2. Marcar como pendiente
curl -X POST http://localhost:3000/api/events/$EVENT_ID_4/respond \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "pending_conversation",
    "message": "Necesitamos hablarlo en persona"
  }'

# Expected Response:
{
  "event": {
    "status": "pending_conversation"
  }
}
```

✅ **Verificar:** status = pending_conversation

---

## 🧪 TEST 5: VALIDACIONES DE SEGURIDAD

### Test 5.1: Solo creador puede proponer

```bash
# USER B intenta proponer evento creado por USER A
curl -X POST http://localhost:3000/api/events/$EVENT_ID/propose \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{ "message": "test" }'

# Expected Error:
{
  "error": "Only event creator can propose"
}
```

✅ **Verificar:** Error 403 (Forbidden)

### Test 5.2: Solo respondedor puede responder

```bash
# USER A intenta responder a su propia propuesta
curl -X POST http://localhost:3000/api/events/$EVENT_ID/respond \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{ "action": "accept" }'

# Expected Error:
{
  "error": "Creator cannot respond to own proposal"
}
```

✅ **Verificar:** Error 403 (Forbidden)

### Test 5.3: Counter-propuesta requiere puntos

```bash
curl -X POST http://localhost:3000/api/events/$EVENT_ID_2/respond \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{ "action": "counter_propose" }'

# Expected Error:
{
  "error": "Points must be provided for counter proposal"
}
```

✅ **Verificar:** Error 400 (Bad Request)

### Test 5.4: No se puede proponer draft no-draft

```bash
# Crear evento en draft
# Proponer (cambiar a proposed)
# Intentar proponer de nuevo
curl -X POST http://localhost:3000/api/events/$EVENT_ID/propose \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{ "message": "segunda vez" }'

# Expected Error:
{
  "error": "Event must be in draft status to propose"
}
```

✅ **Verificar:** Error 400

---

## 🧪 TEST 6: OBTENER PENDING NEGOCIATIONS

```bash
# Crear 2 eventos de User A sin que User B responda
# Luego, como User B...

curl -X GET http://localhost:3000/api/events/user/pending \
  -H "Authorization: Bearer $TOKEN_B"

# Expected Response:
{
  "success": true,
  "count": 2,
  "events": [
    {
      "id": "event-1",
      "title": "Evento 1",
      "status": "proposed",
      "pointsCalculated": 30,
      "createdByUser": { "name": "User A" }
    },
    {
      "id": "event-2",
      "title": "Evento 2",
      "status": "proposed",
      "pointsCalculated": 25
    }
  ]
}
```

✅ **Verificar:**
- Solo eventos propuestos/counter_proposal
- Solo eventos que no creó el usuario
- Ordenados por fecha

---

## 🧪 TEST 7: NOTIFICACIONES

### Check tabla de Notifications

```bash
sqlite3 dev.db

SELECT * FROM "Notification" ORDER BY createdAt DESC LIMIT 5;

# Debería mostrar notificaciones para cada acción:
# - event_proposed
# - event_response (con tipos: accepted, rejected, counter_proposed, pending_conversation)
```

✅ **Verificar:**
- Una notificación por cada acción
- Título descriptivo
- Tipo correcto
- UserId del destinatario correcto

---

## 🏁 TEST 8: FLUJO COMPLETO EN UI (Frontend)

### En Chrome/Firefox

1. **Login como User A**
   - Ir a http://localhost:5173
   - Login con User A
   - Ir a Dashboard

2. **Crear evento**
   - Click "Nuevo Evento"
   - Llenar formulario
   - Status debe ser "draft"

3. **Ver componente EventNegotiationCard**
   - Debería mostrar "Ver Estado de Negociación" o estado actual
   - Click debería cargar estado

4. **Proponer evento**
   - Click "Enviar Propuesta"
   - Debería cambiar a "Propuesta Enviada"

5. **Login como User B**
   - Nueva pestaña/ventana
   - Login con User B
   - Debería ver notificación

6. **Responder propuesta**
   - Ver evento pendiente
   - Opciones: Aceptar, Rechazar, Contra-propuesta, Hablamos
   - Seleccionar una acción
   - Status debe actualizarse

7. **Ver historial**
   - Click "Ver Historial" en EventNegotiationCard
   - Debería mostrar timeline de rondas
   - O abrir NegotiationHistory component

---

## 🔍 DEBUGGING SQL

### Ver eventos en negociación

```bash
sqlite3 dev.db

SELECT id, title, status, currentNegotiationRound, lastProposedPoints, pointsAgreed
FROM "Event"
WHERE status IN ('proposed', 'counter_proposal', 'pending_conversation', 'accepted', 'rejected')
ORDER BY updatedAt DESC;
```

### Ver historial de negociación

```bash
SELECT roundNumber, proposedBy, respondedBy, pointsProposed, responseType, message, createdAt
FROM "Negotiation"
WHERE eventId = 'EVENT_ID'
ORDER BY roundNumber ASC;
```

### Ver notificaciones

```bash
SELECT id, userId, type, title, message, relatedEventId, createdAt
FROM "Notification"
WHERE relatedEventId = 'EVENT_ID'
ORDER BY createdAt DESC;
```

---

## ✅ CHECKLIST FINAL DE TESTING

- [ ] TEST 1: Flujo Aceptar completo
- [ ] TEST 2: Contra-propuesta (ronda 2)
- [ ] TEST 3: Rechazo
- [ ] TEST 4: Pendiente conversación
- [ ] TEST 5.1: Solo creador propone
- [ ] TEST 5.2: Solo respondedor responde
- [ ] TEST 5.3: Counter requiere puntos
- [ ] TEST 5.4: No doble propuesta
- [ ] TEST 6: Pending negotiations lista
- [ ] TEST 7: Notificaciones creadas
- [ ] TEST 8: UI flujos funcionan
- [ ] SQL: Eventos correctos
- [ ] SQL: Negotiation records
- [ ] SQL: Notifications

---

## 🐛 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| 404 en endpoint | Verificar que server.ts importa negotiationV2Routes |
| 401 Unauthorized | Verificar token es válido |
| "Only event creator can propose" | Asegurar que USER_A es el creador |
| "Creator cannot respond" | Usar USER_B para responder |
| "Max 2 rounds" | Segunda contra-propuesta intenta round 3 |
| Notificación no llega | Verificar couple existe, usuarios en same couple |
| Historia vacía | Ejecutar propuesta primero |

---

**Tiempo estimado:** 30-45 minutos
**Resultado esperado:** ✅ Todos los tests pasan
**Próximo paso:** Integrar en dashboard, luego FASE 4
