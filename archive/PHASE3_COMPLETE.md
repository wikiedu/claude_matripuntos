# ✅ FASE 3: NEGOCIACIÓN MEJORADA — COMPLETADA

**Fecha:** 1 de Abril de 2026
**Duración:** Completada en sesión (después de FASE 1 + FASE 2)
**Estado:** 🟢 COMPLETA - Lista para testing
**Progreso Total:** 3/6 fases = 50% ✓

---

## 📋 RESUMEN DE IMPLEMENTACIÓN

### Backend - Servicio de Negociación

✅ **Servicio de Negociación: `negotiationEngine.ts`**

Implementa el flujo de negociación de 2 rondas entre parejas:

```typescript
class NegotiationEngine {
  async proposeEvent(eventId, proposerId, message): Event
  async respondToProposal(eventId, responderId, response): Event
  async getNegotiationHistory(eventId): Negotiation[]
  async getNegotiationStatus(eventId): NegotiationStatus
}
```

**Estados Soportados (6):**
1. `draft` - Evento creado, no enviado
2. `proposed` - Propuesta enviada en ronda 1
3. `counter_proposal` - Contra-propuesta en ronda 2
4. `pending_conversation` - Marcado para discutir en persona
5. `accepted` - Acuerdo alcanzado
6. `rejected` - Sin acuerdo

**Acciones de Respuesta (4):**
- `accept` - Aceptar propuesta, marcar como acordado
- `reject` - Rechazar propuesta
- `counter_propose` - Hacer contra-propuesta (solo ronda 1→2)
- `pending_conversation` - Marcar para hablar en persona

---

### Backend - Rutas API de Negociación

✅ **Rutas de Negociación: `routes/negotiation.ts`**

```
POST   /api/events/:eventId/propose
       - Inicia negociación, envía a pareja
       - Cambia status de draft a proposed
       - Crea Negotiation record ronda 1
       - Envía notificación a pareja

POST   /api/events/:eventId/respond
       - Responde a propuesta (accept/reject/counter/pending)
       - Valida que respondedor ≠ creador
       - Valida máximo 2 rondas para counter_propose
       - Crea Negotiation record con respuesta
       - Envía notificación a creador

GET    /api/events/:eventId/negotiation
       - Retorna estado actual de negociación
       - Incluye participantes y historial
       - Status: {status, currentRound, proposedPoints, agreedPoints, ...}

GET    /api/events/:eventId/negotiation/history
       - Retorna historial completo de negociación
       - Incluye todas las rondas con detalles
       - Ordenado por ronda (asc)

GET    /api/events/user/pending
       - Retorna eventos pendientes para responder del usuario
       - Solo eventos en estado proposed/counter_proposal
       - Excluye eventos creados por el usuario
```

**Validaciones:**
- ✅ Solo creador puede proponer (draft → proposed)
- ✅ Solo no-creador puede responder
- ✅ No se puede responder a draft
- ✅ Máximo 2 rondas de negociación
- ✅ counter_propose requiere pointsProposed
- ✅ Permisos verificados en todos los endpoints

---

### Frontend - API Client

✅ **Métodos Nuevos: `apiClient.negotiation`**

```typescript
negotiation = {
  proposeEvent(eventId, message?)
    → POST /api/events/:eventId/propose
    → Retorna: { success, event, message }

  respondToProposal(eventId, action, pointsProposed?, message?)
    → POST /api/events/:eventId/respond
    → Actions: accept | reject | counter_propose | pending_conversation
    → Retorna: { success, event, message }

  getNegotiationStatus(eventId)
    → GET /api/events/:eventId/negotiation
    → Retorna: { status, participants, history }

  getNegotiationHistory(eventId)
    → GET /api/events/:eventId/negotiation/history
    → Retorna: { negotiations[], totalRounds, eventStatus }

  getPendingNegotiations()
    → GET /api/events/user/pending
    → Retorna: { count, events[] }
}
```

---

### Frontend - Componentes UI

✅ **EventNegotiationCard.tsx** (400+ líneas)
- Muestra estado actual de negociación
- Displays: Status badge, current round, proposed points, agreed points
- Botones contextuales (Proponer/Aceptar/Rechazar/Hablar)
- Expande historial inline
- Manejo de loading y errores
- Código de colores por estado

✅ **CounterProposalForm.tsx** (250+ líneas)
- Formulario para hacer contra-propuestas
- Input numérico para nuevos puntos
- Muestra diferencia con propuesta actual (+ o -)
- Campo de mensaje opcional (max 500 chars)
- Validaciones (rango 0-500, diferente a actual)
- Info box explicando límite de 2 rondas

✅ **NegotiationHistory.tsx** (350+ líneas)
- Timeline visual de toda la negociación
- Muestra cada ronda con icono, fecha, participantes
- Detalles: puntos propuestos, mensajes, tipo de respuesta
- Línea visual conectando rondas
- Resumen de rondas totales y estado
- Botón refresh para actualizar

---

## 📊 ESTADÍSTICAS FASE 3

| Métrica | Cantidad |
|---------|----------|
| Servicio backend | 1 (negotiationEngine) |
| Rutas API | 5 endpoints |
| Métodos API Client | 5 métodos |
| Componentes UI | 3 nuevos |
| Líneas de código | ~1500+ |
| Estados de negociación | 6 |
| Acciones de respuesta | 4 |
| Máximo de rondas | 2 |

---

## 🎯 FLUJO DE NEGOCIACIÓN

```
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 3: NEGOCIACIÓN MEJORADA                 │
└─────────────────────────────────────────────────────────────────┘

PASO 1: CREADOR PROPONE
├─ Usuario A crea evento (status: draft)
├─ Usuario A hace clic "Enviar Propuesta"
├─ proposeEvent() actualiza status → proposed
├─ Crea Negotiation record (round 1, proposedBy: A)
├─ Envía notificación a Usuario B
└─ currentNegotiationRound: 1

PASO 2: RESPONDEDOR RESPONDE (4 opciones)

OPCIÓN A: ACEPTAR
├─ Usuario B hace clic "Aceptar"
├─ respondToProposal(action: 'accept')
├─ Status → accepted, pointsAgreed = lastProposedPoints
├─ Crea Negotiation record (responseType: 'accepted')
├─ Negoción finalizada ✓
└─ Envía notificación a Usuario A

OPCIÓN B: RECHAZAR
├─ Usuario B hace clic "Rechazar"
├─ respondToProposal(action: 'reject')
├─ Status → rejected
├─ Negoción finalizada ✗
└─ Envía notificación a Usuario A

OPCIÓN C: CONTRA-PROPONER (RONDA 2)
├─ Usuario B hace clic "Contra-propuesta"
├─ Abre CounterProposalForm
├─ Ingresa nuevos puntos + mensaje opcional
├─ respondToProposal(action: 'counter_propose', pointsProposed: X)
├─ Status → counter_proposal
├─ currentNegotiationRound: 2
├─ Crea Negotiation record (round 2, pointsProposed: X)
├─ Envía notificación a Usuario A con nuevos puntos
├─ Usuario A vuelve a responder (PASO 2)
│  ├─ Puede aceptar → accepted
│  ├─ Puede rechazar → rejected
│  └─ NO puede contra-proponer (max 2 rondas)
└─ Negociación finalizada

OPCIÓN D: PENDIENTE CONVERSACIÓN
├─ Usuario B/A hace clic "Hablamos en Persona"
├─ respondToProposal(action: 'pending_conversation')
├─ Status → pending_conversation
├─ Negoción pausada, requiere conversación
└─ Envía notificación con mensaje

VISUALIZACIÓN DE HISTORIAL
├─ EventNegotiationCard muestra estado actual
├─ Botón "Ver Historial" expande inline
├─ NegotiationHistory.tsx muestra timeline completo
├─ Cada ronda con: icono, fecha, participantes, puntos, mensaje
└─ Total de rondas mostrado
```

---

## 🧪 TESTING RECOMENDADO

### 1. Backend API Testing

```bash
# 1. Proponer evento (como creador)
curl -X POST http://localhost:3000/api/events/{eventId}/propose \
  -H "Authorization: Bearer [TOKEN_A]" \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Te parece bien para el sábado?"}'

# 2. Obtener estado de negociación
curl -X GET http://localhost:3000/api/events/{eventId}/negotiation \
  -H "Authorization: Bearer [TOKEN_B]"

# 3. Aceptar propuesta (como respondedor)
curl -X POST http://localhost:3000/api/events/{eventId}/respond \
  -H "Authorization: Bearer [TOKEN_B]" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}'

# 4. Obtener historial
curl -X GET http://localhost:3000/api/events/{eventId}/negotiation/history \
  -H "Authorization: Bearer [TOKEN_A]"

# 5. Ver pending negotiations
curl -X GET http://localhost:3000/api/events/user/pending \
  -H "Authorization: Bearer [TOKEN_B]"
```

### 2. Frontend Testing Checklist

- [ ] Evento en estado draft muestra botón "Enviar Propuesta"
- [ ] Clic envía propuesta y cambia a "Propuesta Enviada"
- [ ] Notificación llega a pareja
- [ ] Pareja ve botones Aceptar/Rechazar
- [ ] Aceptar cambia estado a "Aceptado" ✓
- [ ] Rechazar cambia estado a "Rechazado" ✗
- [ ] En ronda 1, pareja puede contra-proponer
- [ ] CounterProposalForm valida puntos
- [ ] Contra-propuesta cambia ronda a 2
- [ ] En ronda 2, no hay botón contra-proponer
- [ ] Opción "Hablamos en Persona" funciona
- [ ] Historial muestra todas las rondas
- [ ] Timeline visual es clara y readable
- [ ] Permisos: solo creador puede proponer
- [ ] Permisos: solo respondedor puede responder

### 3. Edge Cases

- [ ] Usuario intenta proponer evento ya propuesto (error)
- [ ] Usuario intenta responder a evento que no le pertenece (error)
- [ ] Usuario intenta hacer 3ª ronda (error 'max 2 rounds')
- [ ] Contra-propuesta sin puntos (error)
- [ ] Puntos fuera de rango (error)
- [ ] Dos usuários simultáneamente (último gana)

---

## 📝 EJEMPLO DE FLUJO COMPLETO

### Escenario: Cena Romántica el Sábado

**Paso 1: Usuario A crea evento**
```json
{
  "title": "Cena romántica",
  "dateStart": "2026-04-05T20:00:00",
  "category": "Gastronomía",
  "pointsCalculated": 28
}
STATUS: draft
```

**Paso 2: Usuario A propone**
```
POST /api/events/123/propose
Body: { message: "¿Te parece para el sábado?" }

EVENT STATUS: draft → proposed
NEGOTIATION ROUND: 1
CREATED BY: User A
POINTS PROPOSED: 28
```

**Paso 3: Usuario B ve propuesta**
```
Notificación: "Usuario A propuso 'Cena romántica' - 28 puntos"
Opciones: Aceptar | Rechazar | Contra-propuesta | Hablamos
```

**Paso 4: Usuario B contra-propone**
```
POST /api/events/123/respond
Body: {
  action: "counter_propose",
  pointsProposed: 35,
  message: "Para que valga más la pena, ¿35 puntos?"
}

EVENT STATUS: counter_proposal
NEGOTIATION ROUND: 2
NEW POINTS: 35 (+ 25% vs 28)
```

**Paso 5: Usuario A decide**
```
Notificación: "Usuario B contra-propuso 35 puntos"
Opciones: Aceptar | Rechazar (sin contra-propuesta, max 2 rondas)
```

**Paso 6: Usuario A acepta**
```
POST /api/events/123/respond
Body: { action: "accept" }

EVENT STATUS: accepted
POINTS AGREED: 35
NEGOTIATION FINALIZED ✓
```

**Historial Visible:**
```
Ronda 1 (28 pts)
├─ User A propone: 28 puntos
│  "¿Te parece para el sábado?"
└─ 20:30 1 de Abril

Ronda 2 (35 pts)
├─ User B contra-propone: 35 puntos
│  "Para que valga más la pena, ¿35 puntos?"
└─ 20:45 1 de Abril

Resultado
├─ User A acepta: 35 puntos
│  ACEPTADO ✓
└─ 20:50 1 de Abril
```

---

## 🔄 INTEGRACIÓN CON FASE ANTERIOR

**FASE 1-2 → FASE 3:**
- ✅ Eventos creados en FASE 1 pueden ahora negociarse
- ✅ Puntos calculados en FASE 2 se usan en negociación
- ✅ Notificaciones mostradas en dashboard
- ✅ Histórico de negociación aparece en eventos

**Base de Datos:**
- Tabla `Event` ya tiene campos necesarios:
  - `status` (string enum)
  - `currentNegotiationRound` (int)
  - `lastProposedBy` (FK User)
  - `lastProposedPoints` (int)
  - `pointsAgreed` (int)
  - `justification` (string)
- Tabla `Negotiation` existía, ahora completamente usada
- Tabla `Notification` existía, ahora con tipos negociación

---

## ✨ CARACTERÍSTICAS PRINCIPALES

### Para el Usuario

✅ **Propuestas Claras**
- Estado visual evidente (badges de color)
- Puntos propuestos siempre visibles
- Historial completo transparent

✅ **Flexibilidad**
- Puede aceptar, rechazar o contra-proponer
- Una opción "hablamos en persona" para temas complejos
- Máximo 2 rondas = eficiencia

✅ **Comunicación**
- Mensajes opcionales en cada acción
- Notificaciones de cambios
- Timeline visual clara

### Para el Arquitecto

✅ **Estado Machine Limpio**
- 6 estados bien definidos
- Transiciones validadas
- No hay estados huérfanos

✅ **2 Rondas Balance**
- Tiempo suficiente para llegar a acuerdo
- No infinito (evita deadlock)
- Escalada clara a "conversación en persona"

✅ **Auditoría Completa**
- Cada acción registrada en Negotiation table
- Timestamps para todas las acciones
- Historial inmutable

---

## 🐛 Debugging Tips

### Si propuesta no se envía:
1. Verificar que usuario es creador de evento
2. Verificar que evento status es 'draft'
3. Revisar logs del backend
4. Verificar token de autenticación

### Si respuesta falla:
1. Verificar que usuario NO es creador
2. Verificar que evento status es 'proposed' o 'counter_proposal'
3. Si counter_propose, verificar roundNumber < 2
4. Verificar pointsProposed está en rango (0-500)

### Si historial no carga:
1. Verificar que evento existe
2. Ejecutar query directa: `SELECT * FROM "Negotiation" WHERE eventId='...'`
3. Verificar que user tiene couple

### Si notificaciones no llegan:
1. Revisar tabla Notification
2. Verificar que createdBy != responderId
3. Revisar logs en backend

---

## 📈 PRÓXIMOS PASOS (FASE 4)

**Gamificación (Semanas 7-8)**
- Table Achievement con logros predefinidos
- Achievement conditions (ej: "5 eventos acordados")
- UserAchievement para tracking
- Dashboard con badge display
- Puntos bonus por achievements

---

## 🎉 RESUMEN FINAL FASE 3

**COMPLETADO:**
- ✅ 1 servicio backend (NegotiationEngine)
- ✅ 5 endpoints API nuevos
- ✅ 5 métodos API client
- ✅ 3 componentes React
- ✅ 6 estados de negociación
- ✅ 4 acciones de respuesta
- ✅ Sistema de 2 rondas
- ✅ Validaciones de permisos
- ✅ Timeline visual historial
- ✅ Manejo de errores completo

**ESTADO DEL PROYECTO:**
- Progreso total: 50% (3/6 fases)
- Tiempo invertido: ~1 hora (FASE 3)
- Tiempo total hasta aquí: ~4-5 horas

**LISTO PARA:**
- ✅ Testing de negociación
- ✅ Integración con dashboard
- ✅ Deploy a staging
- ✅ FASE 4 (Gamificación)

---

**Documento generado:** 1 de Abril de 2026
**Versión:** FASE 3 Complete ✅
**Próxima fase:** FASE 4 - Gamificación
**Progreso Total:** 3/6 fases = 50% ✓
