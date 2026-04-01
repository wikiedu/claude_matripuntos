# 🚀 Plan de Implementación - Matripuntos V1.1+

**Fecha:** Abril 1, 2026
**Estado:** Iniciando implementación

---

## 📊 Resumen del Proyecto

**MVP Completado:**
- ✅ Backend con 15+ endpoints básicos
- ✅ Frontend con 5 páginas principales
- ✅ Auth con JWT
- ✅ Database schema con 11 tablas
- ✅ Cálculo de puntos base

**Línea de Entrega:** MVP funcional - lista para testing

---

## 🎯 Fases de Implementación

### FASE 1: Task Verification Flows (P0 - CRÍTICO)
**Descripción:** Completar el flujo de verificación y disputa de tareas

**Componentes:**

#### Backend:
- [ ] `PUT /api/tasks/:taskId/logs/:logId/verify` - Verificar tarea completada
- [ ] `PUT /api/tasks/:taskId/logs/:logId/dispute` - Disputar tarea (crear negociación)
- [ ] `GET /api/tasks/:taskId/logs/:logId` - Ver detalles log
- [ ] `POST /api/tasks/:taskId/logs/:logId/resolve` - Resolver disputa

**Lógica:**
1. User A marca tarea como completada
2. User B puede:
   - Aceptar (puntos se aplican)
   - Disputar (entra en negociación de puntos)
   - Pasar (pendiente de revisión)
3. Si disputar: se crea round de negociación con máx 2 intentos gratis

#### Frontend:
- [ ] `Dashboard.tsx` - Mostrar "Tareas pendientes de verificación"
- [ ] Componente `TaskVerificationCard.tsx` - Ver + aceptar/disputar/pasar
- [ ] Flujo de disputa integrado con sistema de negociación existente
- [ ] Histórico de disputas en historial

**Archivos a crear/modificar:**
```
Backend:
- src/routes/taskRoutes.ts (agregar endpoints faltantes)
- src/services/taskService.ts (crear - lógica de tareas)

Frontend:
- src/components/TaskVerificationCard.tsx (NEW)
- src/pages/Dashboard.tsx (actualizar)
- src/utils/taskCalculator.ts (NEW - multiplicadores de hijos)
```

---

### FASE 2: Points History & Analytics (P1 - IMPORTANTE)
**Descripción:** Sistema completo de historial y estadísticas

**Componentes:**

#### Backend:
- [ ] `GET /api/points/history` - Historial de transacciones
  - Filtros: tipo, usuario, rango fechas, status
- [ ] `GET /api/points/balance` - Saldo actual de ambos usuarios
- [ ] `GET /api/points/stats` - Estadísticas (solo PREMIUM)
  - Equidad score (0-100)
  - Tareas más frecuentes
  - Eventos más costosos
  - Velocidad de acuerdo promedio
- [ ] `GET /api/points/transactions/:id` - Detalle de transacción

**Lógica:**
- Saldo = suma de transacciones por usuario
- Equidad = |saldo| / totalPuntos (cuán desbalanceado)
- Histórico: filtrable por período, tipo, responsable

#### Frontend:
- [ ] Nueva página `Pages/History.tsx` - Historial completo
- [ ] Nueva página `Pages/Analytics.tsx` - Estadísticas (PREMIUM)
- [ ] Componente `BalanceCard.tsx` - Mostrar saldos + gráfico
- [ ] Componente `TransactionList.tsx` - Tabla historial
- [ ] Componente `StatsChart.tsx` - Gráficos Analytics

**Archivos a crear/modificar:**
```
Backend:
- src/routes/pointsRoutes.ts (NEW)
- src/services/pointsService.ts (NEW)

Frontend:
- src/pages/History.tsx (NEW)
- src/pages/Analytics.tsx (NEW)
- src/components/BalanceCard.tsx (NEW)
- src/components/TransactionList.tsx (NEW)
- src/components/StatsChart.tsx (NEW)
- src/App.tsx (agregar rutas)
- src/store/useAppStore.ts (actualizar)
```

---

### FASE 3: Notifications System (P1 - IMPORTANTE)
**Descripción:** Sistema de notificaciones in-app, email y push

**Componentes:**

#### Backend:
- [ ] `GET /api/notifications` - Listar notificaciones del usuario
- [ ] `PUT /api/notifications/:id/read` - Marcar como leída
- [ ] `DELETE /api/notifications/:id` - Eliminar notificación
- [ ] Crear notificación automáticamente para:
  - Solicitud de evento recibida
  - Respuesta a negociación
  - Tarea pendiente de verificación
  - Disputa de tarea
  - Cambios en configuración

**Lógica:**
- Cada acción importante crea una Notification
- In-app: siempre se muestra
- Email: configurable por usuario (feature)
- Push: configurable por usuario (feature)

#### Frontend:
- [ ] Componente `NotificationBell.tsx` - Bell icon con contador
- [ ] Componente `NotificationCenter.tsx` - Drawer/modal de notificaciones
- [ ] Actualizar `Dashboard.tsx` para mostrar notificaciones pendientes
- [ ] Integrar en Navigation header

**Archivos a crear/modificar:**
```
Backend:
- src/routes/notificationRoutes.ts (NEW)
- src/services/notificationService.ts (NEW)
- Actualizar todos los routes (agregar creación de notifications)

Frontend:
- src/components/NotificationBell.tsx (NEW)
- src/components/NotificationCenter.tsx (NEW)
- src/pages/Navigation.tsx (agregar bell)
- src/App.tsx (agregar rutas)
- src/store/useAppStore.ts (agregar notifications state)
```

---

### FASE 4: Configuration Management (P1 - IMPORTANTE)
**Descripción:** Gestión de configuración de pareja (puntos, multiplicadores, reglas)

**Componentes:**

#### Backend:
- [ ] `GET /api/configuration` - Obtener config actual
- [ ] `PUT /api/configuration` - Actualizar config
  - Puntos base de tareas
  - Multiplicadores
  - Tipos de actividades
  - Reglas (máximo descuento, máximo puntos, etc.)
- [ ] `PUT /api/configuration/reset` - Restaurar defaults

**Lógica:**
- Config es por pareja (única por Couple)
- Se almacena como JSON en Configuration table
- Ambos usuarios pueden editar
- Cambios se registran en log de auditoría

#### Frontend:
- [ ] Nueva página `Pages/Configuration.tsx`
- [ ] Tabs:
  1. Datos básicos (hijos, zona horaria, lenguaje)
  2. Tabla de puntos (cocina, limpieza, etc.)
  3. Multiplicadores (hora, duración, hijos)
  4. Reglas de negociación (rondas, descuentos, máx puntos)
  5. Preferencias pareja (notificaciones, privacidad)

**Archivos a crear/modificar:**
```
Backend:
- src/routes/configurationRoutes.ts (NEW)
- src/services/configurationService.ts (NEW)

Frontend:
- src/pages/Configuration.tsx (NEW)
- src/components/ConfigurationCard.tsx (NEW - reutilizable)
- src/App.tsx (agregar ruta)
- src/store/useAppStore.ts (agregar config state)
```

---

### FASE 5: Premium Features (P2 - IMPORTANTE)
**Descripción:** Desbloquear features premium (rondas ilimitadas, analytics, etc.)

**Componentes:**

#### Backend:
- [ ] `GET /api/subscription` - Estado de suscripción
- [ ] `POST /api/subscription/upgrade` - Actualizar a premium
- [ ] Middleware para verificar suscripción en endpoints premium
- [ ] Validación de features basado en plan

**Lógica:**
- Plans: free, premium (€2.99/mes), pro (€5.99/mes)
- free: 2 rondas negociación, sin analytics, sin mediación
- premium: rondas ilimitadas, analytics, mediación, email notif
- pro: todo + integraciones + custom rules

#### Frontend:
- [ ] Componente `PricingCard.tsx` - Mostrar planes
- [ ] Modal de upgrade
- [ ] Badge "PREMIUM" en features premium
- [ ] Página de checkout (integración Stripe - MVP básico)

**Archivos a crear/modificar:**
```
Backend:
- src/routes/subscriptionRoutes.ts (NEW)
- src/middleware/premiumMiddleware.ts (NEW)
- src/services/subscriptionService.ts (NEW)

Frontend:
- src/components/PricingCard.tsx (NEW)
- src/components/PremiumBadge.tsx (NEW)
- src/pages/Pricing.tsx (NEW)
- src/App.tsx (agregar ruta)
```

---

### FASE 6: Enhanced Negotiation Flows (P2 - IMPORTANTE)
**Descripción:** Completar sistema de negociación con mediación y fuerza

**Componentes:**

#### Backend:
- [ ] `POST /api/negotiations/:id/mediate` - Sugerencias de mediación
  - Dividir actividad
  - Añadir compensación
  - Donación de puntos
- [ ] `POST /api/negotiations/:id/force` - Forzar con matripuntos acumulados
- [ ] Validar que usuario tiene saldo suficiente para forzar

#### Frontend:
- [ ] Actualizar `RequestInbox.tsx` para mostrar opciones de mediación
- [ ] Modal de "Fuerza con Matripuntos"
- [ ] Flujo completo de negociación mejorado

**Archivos a modificar:**
```
Backend:
- src/routes/negotiationRoutes.ts (completar)
- src/services/negotiationService.ts (NEW)

Frontend:
- src/pages/RequestInbox.tsx (actualizar)
- src/components/NegotiationMediation.tsx (NEW)
```

---

### FASE 7: Compensation & Advanced Features (P3 - MEJORAS)
**Descripción:** Sistema completo de compensaciones y features avanzadas

**Componentes:**

#### Backend:
- [ ] Mejorar endpoints de compensaciones
- [ ] Validaciones de compensación máximas
- [ ] Descuentos aplicados correctamente

#### Frontend:
- [ ] Selector de compensaciones al crear evento
- [ ] Preview en tiempo real de puntos con compensación
- [ ] Historial de compensaciones aceptadas/rechazadas

**Archivos a modificar:**
```
Frontend:
- src/pages/RequestActivity.tsx (mejorar)
- src/components/CompensationSelector.tsx (NEW)
```

---

### FASE 8: Testing & Polish (P3 - FINAL)
**Descripción:** Tests, documentación, y pulido de UI

**Componentes:**
- [ ] Tests unitarios para lógica de puntos
- [ ] Tests de integración para API
- [ ] Tests E2E para flujos principales
- [ ] Pulido de UI/UX
- [ ] Documentación actualizada
- [ ] Performance optimization

---

## 🔄 Orden de Implementación Recomendado

1. **FASE 1** (Task Verification) - 2-3 días
   - Necesario para que el MVP sea funcional
   - Bloquea otras features

2. **FASE 3** (Notifications) - 1-2 días
   - Mejora experiencia usuario
   - Relativamente simple

3. **FASE 2** (History & Analytics) - 2-3 días
   - Importante para UX
   - Muchos componentes

4. **FASE 4** (Configuration) - 2 días
   - Debe estar antes de Premium
   - Mejora flexibilidad

5. **FASE 5** (Premium) - 2-3 días
   - Modelo de negocio
   - Depende de Phases 1-4

6. **FASE 6** (Negotiations Enhancement) - 2 días
   - Completar negociación
   - Mejora UX

7. **FASE 7** (Compensations) - 1 día
   - Refinamiento

8. **FASE 8** (Testing & Polish) - 3+ días
   - Production-ready

**Total estimado:** 15-20 días de desarrollo

---

## 📈 Progreso

| Fase | Tarea | Status | Fecha |
|------|-------|--------|-------|
| 1 | Task Verification | ⏳ Pendiente | - |
| 2 | History & Analytics | ⏳ Pendiente | - |
| 3 | Notifications | ⏳ Pendiente | - |
| 4 | Configuration | ⏳ Pendiente | - |
| 5 | Premium Features | ⏳ Pendiente | - |
| 6 | Negotiation Flows | ⏳ Pendiente | - |
| 7 | Compensations | ⏳ Pendiente | - |
| 8 | Testing & Polish | ⏳ Pendiente | - |

---

## 🎯 Métricas de Éxito

- [ ] Todas las funcionalidades de MVP documentadas funcionando
- [ ] 90%+ de endpoints implementados y testeados
- [ ] UI completamente funcional y responsiva
- [ ] Sistema de notificaciones activo
- [ ] Analytics básicos funcionando
- [ ] Premium tier desbloqueado
- [ ] Código limpio y bien documentado
- [ ] Production-ready

---

**Siguiente paso:** Iniciar FASE 1 (Task Verification Flows)
