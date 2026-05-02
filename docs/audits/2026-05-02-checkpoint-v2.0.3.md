# Checkpoint Matripuntos · v2.0.3 — Auditoría 360 + Brainstorming + Spec v2.0.4

**Fecha:** 2026-05-02
**Estado código:** v2.0.3 desplegado en producción · 336 tests CI verdes · 19 tags
**Metodología:** 4 subagentes Explore en paralelo (técnico / UX / competencia / negocio) + síntesis Opus 4.7

---

## 1. Inventario de lo desplegado

| Versión | Lo que aporta | Uso esperado | Estado |
|---|---|---|---|
| MVP→v1.5.1 | Auth, couple, events, tasks, points engine, calendar v1 | 80% users / 100% engagement | ✅ Estable |
| v1.6 | Avatares, mood, frase del día | 40% users / 30% engagement | ✅ Estable |
| v1.6.1-v1.6.7 | Privacy GDPR, telemetría, lifecycle, audit fixes, Resend skeleton | Compliance | ✅ Estable |
| v1.7 | Niveles pareja, achievements 30, streaks, retos, replays, web push | 40% users / 60% engagement | ✅ Activo (flag ON, push sin VAPID) |
| v2.0.1 | Calendar 360 schema + entries + service providers + Google esqueleto | 30% users (calendar pesado) | ✅ Activo (Google sin OAuth) |
| v2.0.2 | Journaling: prompts diarios + entries + reactions + retrospectivas | 10-25% users (nicho) | ✅ Activo |
| v2.0.3 | Analytics Pro: aggregator con invariantes mat. + insights + heatmap | 25% users (introspección) | ✅ Activo |
| v1.8-prep | RefreshToken schema + service (sin activar) | Seguridad futuro | 🟡 Schema, no activo |

---

## 2. Resultados auditoría técnica (S0 → S3)

**Veredicto: apto para producción con 2 hotfixes simples.**

### S0 Crítico
- ✅ Ninguno. Los S0 de la auditoría pre-v1.7 fueron resueltos en hotfixes v1.6.x.

### S1 Alto (2 — todos arreglables en 30min cada uno)
- **S1-1 IDOR Journal recipientId** (`routes/journal.ts:77`): user del couple A puede mandar journal entry tipo "letter" a user del couple B porque no se valida que `recipientId` pertenezca al mismo couple. **Fix:** validación previa.
- **S1-2 Push unsubscribe sin coupleId** (`routes/notificationsPush.ts:67`): `deleteMany({ userId, endpoint })` permitiría a un user borrar push subscriptions de otro si conoce el endpoint. **Fix:** filtrar por coupleId.

### S2 Medio (4 — deuda menor)
- Replay key sin límite de longitud → URL > 2048 bytes posible.
- Journal `prompts/today` sin `take` limit (mitigado por ventana 30d).
- CoupleReplaySeen race teórica (mitigada por unique constraint).
- Patrón feature flag `!== 'false'` replicado 4 veces (centralizar en util).

### S3 Bajo (5 — refactor)
- Push templates en español hardcoded (sin i18n).
- Magic numbers (`take: 500`).
- cryptoService espera googleapis SDK real.
- Edge cases falta cubrir en levelService/streakService.
- JournalPrompt seed faltante en producción (UI prompts diaria mostrará null).

### Verificaciones pasadas
- ✅ Filtros coupleId/userId en todas las routes nuevas.
- ✅ Rate-limit aplicado correctamente (read/write buckets).
- ✅ Servicios puros sin queries internas (aggregator, levelService, etc.) → 0 chance de mismatch entre vistas.
- ✅ Crons registrados correctamente.
- ✅ Push templates sin PII.
- ✅ Migration order correcto.
- ✅ Feature flags consistentes.

---

## 3. Resultados auditoría UX/UI

**Veredicto: bien estructurado en general, 4 must-fix simples para mejorar mobile-first.**

### Must-fix (bloquea experiencia)
1. **Button component sin focus-visible** → fallo WCAG 2.4.7. 1 línea CSS.
2. **Bottom-nav padding insuficiente** (`pb-4` en pages, debería ser `pb-20`) → contenido tapado por nav.
3. **Botón "olvidé contraseña" sin onClick** en Login → parece interactivo pero no es. Implementar o eliminar.
4. **Safe-area iOS notch** sin `pb-safe` en BottomNav → solapa con home indicator.

### Should-fix (mejora notable)
5. Toasts tras acciones (mood guardado, tarea verificada, eliminar cuenta) — falta confirmación visual.
6. Inconsistencia modal/sheet (algunos centrados, otros bottom) — unificar a BottomSheet.
7. Asimetría onboarding invitee vs creador (invitee no elige categorías).
8. "Hogar" en BottomNav → renombrar a "Tareas".

### Nice-to-have
9. FAB con copy/share del código de pareja accesible.
10. Breadcrumb en Settings con jerarquía visible.
11. Empty states completos con placeholders amigables.
12. Notification in-app toast tras eventos del partner.

### Puntos fuertes destacados
- Dark theme coherente, paleta limpia.
- MoodPairCard compacto v1.6.3 muy bien ejecutado.
- Onboarding modal del invitee bien pensado.
- ARIA labels + describedby en inputs (WCAG 3.3.1 OK).
- Mobile max-width 500px responsive.

---

## 4. Resultados análisis competencia

### Diferenciador único de Matripuntos
**Gamificación de tareas + actividades específicamente para PAREJAS** (no familias, no individuals). Ningún competidor combina:
1. Contexto relacional íntimo (pareja, no familia de 5).
2. Gamificación + economía de equilibrio (no transaccional financiera).
3. Negociación transparente con consenso explícito.

### Apps de referencia (15 analizadas)
- **Parejas:** Honeydue (finanzas), Paired/Lasting (relacional/terapia), Between (privacidad), Cupla (calendario).
- **Familia/hogar:** Cozi (calendario), OurHome (kids), Tody/Sweepy (limpieza), Picniic (hub).
- **Gamificación pura:** Habitica (RPG), TickTick/Todoist (tareas), Daylio/Reflectly (mood/journal).

### Gaps obvios (todos tienen y nosotros no)
1. **Image proof de tareas** (Sweepy "Work Approval") — fotos como social element.
2. **AI weekly recap** ("This week you two were fire") — Reflectly/Daylio.
3. **Google Calendar sync read** (Cupla, Cozi) — esqueleto en v2.0.1, sin activar.
4. **Streak counter visible everywhere** (Habitica, fitness apps) — tenemos schema pero UI compacta.
5. **Integration ecosystem** (Todoist 200+ apps) — silo total.

### Top 5 ideas a robar/adaptar (impacto/esfuerzo)
| # | Idea | Esfuerzo | Impacto | Por qué |
|---|---|---|---|---|
| 1 | **Image proof de tareas** | Medio | Alto | Aumenta accountability + social element |
| 2 | **AI weekly recap narrativo** | Medio | Alto | Engagement psicológico, builds habit |
| 3 | **Streak counter visible everywhere** | Bajo | Medio-Alto | Fear of breaking streak es powerful |
| 4 | **Google Calendar sync (read-only completar)** | Medio | Medio | Reduce fricción duplicar eventos |
| 5 | **Couple anniversary timer + hitos** | Ultra-bajo | Medio-Alto | Gamificación emocional high retention |

### Riesgo competitivo
Si Honeydue (5M+ DAU) o Cupla añaden gamificación de tareas mañana, el foso de Matripuntos desaparece. **Defensa:** datos propios anonimizados + research thought leadership (publicar estudios sobre equilibrio doméstico) + privacy-first como value prop.

---

## 5. Resultados análisis modelo de negocio (honestidad brutal)

**Veredicto: producto viable, mercado real, pero ESTAMOS SOBRE-ENGINEERING.**

### Propuesta de valor
- **Clara:** "gamificar el equilibrio en pareja vía negociación + puntos transparentes" = cristalino.
- **Diferencial:** SÍ pero **frágil**. Copiable en 6 meses si competitor decide.
- **Demanda:** dolor crónico (no agudo). Usuarios no buscan activamente esta solución → demanda pull débil.

### Funcionalidades vs uso real
**Tier 1 (80% users / 100% engagement):**
- Balance puntos · crear evento · aceptar/rechazar · dashboard · tareas recurrentes

**Tier 3 (10% users / 10% engagement):**
- Journaling, analytics pro, themes premium, AI advisor, anuario PDF

**Recomendación: si tuvieras que quitar 5 features hoy:**
1. v1.7 Streaks (mantener levels, quitar streaks compulsivos).
2. v2.0.2 Journaling completo (fuera del core).
3. v2.0.3 Analytics Pro (mantener heatmap básico, quitar tendencias).
4. Avatares B&C (emoji+color suficiente).
5. Multi-couple history (edge case raro).

### Engagement loops
- ¿Por qué vuelve mañana? Notificación + frase + mood. Fragil — si pareja sin fricción doméstica, app se vuelve ceremonia. Si con fricción crónica, app puede acelerar resentimiento.
- ¿Y a 3 meses? Solo si pareja ya está engaged. Una pareja dormida no regresa por retrospectivas.
- **Riesgo emocional:** modelo de puntos puede generar conflictos en parejas con dinámica tóxica → arma emocional. **Necesita "modo pausa" del sistema.**

### Monetización (v3.0 spec)
- **4.99€/mes 39€/año:** correcto España, pero **lanzar Premium sin base de ≥1000 MAU = error.**
- **Trial 14d sin tarjeta:** correcto.
- **AI Claude Haiku como halo:** valor presente bajo. Conflict_advisor tiene **liability legal** (consejo equivocado → demanda).
- **Recomendación:** **postponer Premium a v3.1**. v3.0 = polish core + app nativa + SEO. Premium después de validar retention D30.

### Crecimiento
- **Sistema referidos v2.1:** K-factor realista 0.3-0.4. Lento. La mayoría de parejas no tienen "otra pareja amiga en misma etapa".
- **Falta SEO:** keywords como "repartir tareas pareja" 17K searches/mes ES, sin presencia. **Red flag.**
- **Sin app nativa:** discoverability ~0. App Store es 40-50% de DAU B2C.

### Recomendación principal: 2 sprints antes de Premium
**Sprint A — Core hardening:**
- Telemetría completa hoy (PostHog) — decidir features con DATOS, no opiniones.
- A/B test push messaging (3 variantes 30d).
- Simplificar negociación a 2 pantallas (hoy 3).
- Email re-engagement D7/D14/D30 si user inactivo.

**Sprint B — Monetization readiness:**
- Paywall preview (banner "Próximamente Premium" + waitlist email).
- Free tier caps (3 service providers, 1 referral activo).
- Stripe webhook receiver skeleton.
- Premium feature flags listos.

**NO hacer ahora:** Themes premium · AI advisor · React Native · Social leaderboards.

### Foso defensivo (débil hoy)
- Datos propietarios anonimizados → research papers.
- Algoritmo de puntos transparente + auditable → thought leadership.
- Comunidad (foro privado) → network effect débil pero existo.
- Privacy + local-first → diferencial vs Honeydue (monetiza con ads).

### Ideas no en roadmap (5)
1. **Conflict pre-detection** (mood + dispute history → proponer task rotation).
2. **Couples goals / joint bucket** (meta compartida no transaccional).
3. **Therapist read-only dashboard** (B2B nicho, diferencial fuerte).
4. **Task preference learning** (Ana ama jardín, Edu odia → sugerir reparto auto).
5. **Couple anniversary timer + hitos** (3,847 días juntos → próximo hito 4000).

---

## 6. Síntesis para decidir qué viene después

### Lo que el técnico, UX y negocio coinciden:

1. **NO añadir más features hasta validar retención** con datos reales (telemetría PostHog activada).
2. **2 hotfixes técnicos** (S1-1 + S1-2) son rápidos y necesarios → 1h dev.
3. **4 must-fix UX** son rápidos y mejoran experiencia → 2h dev.
4. **Premium debe esperar** a v3.1 — antes hace falta core hardening + SEO + app nativa.

### Donde discrepan:

- **Negocio dice:** quitar journaling, streaks, analytics pro (sobre-engineering).
- **Competencia dice:** robar AI recap, image proof, streak visible (más gamificación).
- **Técnico/UX:** todo está bien hecho técnicamente, solo necesita pulir.

### Recomendación de Claude (mi síntesis):

**No quitar features ya construidas** — coste hundido, ya están testeadas. Pero **NO seguir construyendo verticalmente**. En su lugar:
- 1 sprint de **horizontal hardening**: telemetría + UX fixes + 2 hotfixes técnicos + SEO content.
- Después decidir v2.0.4 según datos reales D30.

---

## 7. Tu propuesta v2.0.4 (catálogo actividades + config consensuada)

### Lo bueno
- Resuelve asimetría real: tasks tienen catálogo, activities no. Coherencia conceptual.
- Configuración consensuada refuerza pillar "equidad" — las reglas también son negociables.
- Es coherente con la filosofía del producto (transparencia + consenso).

### Lo cuestionable
- ¿Es lo más impactante en retención? Negocio sugiere que NO — primero validar D30 con telemetría.
- Añade **complejidad UX** sobre 7+ submenús ya. Hay que **simplificar antes** o aceptar saturación.
- ¿Conflicto con Tasks catalog? Ambos son catálogos — riesgo de duplicación conceptual.

### Mi recomendación
**Sí construir v2.0.4** pero **después de v2.0.3.1 hardening sprint**. Orden óptimo:
1. **v2.0.3.1 hardening** (3-5 días): 2 hotfixes técnicos + 4 UX must-fix + telemetría completa + email re-engagement + 5 SEO posts blog.
2. **v2.0.4 catálogo + config consensuada** (5-7 días): tu propuesta.
3. **v2.0.5 quick-wins competencia** (3 días): image proof + AI weekly recap + couple anniversary timer.
4. Después → datos D30 → decidir v2.1 vs v3.0.

---

## 8. 15 preguntas decisorias para el spec v2.0.4 final

(Repetidas del mensaje anterior — mantengo ID consistente)

**Sobre el catálogo de actividades:**
1. ¿Catálogo Tasks y Activities unificados o separados?
2. ¿Catálogo seed cerrado o crowd-sourced/editable?
3. ¿Cuántas categorías + sub-actividades inicialmente?
4. ¿2 o 3 niveles de jerarquía?
5. ¿"Numerarlas" = contar instancias del mes o priorizarlas?

**Sobre la configuración consensuada:**
6. ¿Qué configuraciones requieren consenso?
7. ¿Modelo propuesta abierta vs timeout 7d auto-acepta/rechaza?
8. ¿Cap propuestas pendientes simultáneas?
9. ¿Histórico de cambios visible?
10. ¿Reset a defaults factory?

**Sobre integración:**
11. ¿Pre-fill puntos editable o fijo?
12. ¿"Numeración" se muestra en Analytics?
13. ¿Migrar Events viejos retroactivamente?
14. ¿Idiomas iniciales?

**Sobre prioridad:**
15. ¿Tras v2.0.4 prefieres v2.1 / v3.0 / pulido UX / RN?

## 9. 5 preguntas adicionales tras el brainstorming

16. **¿Activamos PostHog telemetría YA?** Sin esto, decidir entre features es opinión. Necesitas POSTHOG_KEY. (mi recomendación: SÍ urgente).
17. **¿Implementamos los 2 hotfixes S1 técnicos AHORA?** Son 1h dev y cierran riesgo IDOR. (mi recomendación: SÍ).
18. **¿Implementamos los 4 must-fix UX AHORA?** Son 2h dev. (mi recomendación: SÍ, juntos con S1).
19. **¿Construimos v2.0.4 con scope completo o subset?** Tu spec puede simplificarse a "catálogo + propuesta cambio multipliers" como MVP, dejando consenso de TODOS los settings para v2.0.5. (mi recomendación: subset MVP).
20. **¿Aceptas postponer Premium a v3.1?** Si SÍ, redirigimos esfuerzos a hardening + SEO + app nativa. Si NO, mantenemos v3.0 plan original. (mi recomendación: SÍ postponer).

---

## 10. Próxima acción recomendada

**Si dices "tu propuesta en todo":**
1. Hago hotfix técnico v2.0.3.1 (S1-1 + S1-2 + 4 UX must-fix) → 3-4h dev.
2. Habilito PostHog telemetría con instrucciones para que tú añadas la API key en Render.
3. Escribo spec v2.0.4 simplificado (catálogo activities + propuesta multipliers MVP).
4. Pongo en pausa el resto del roadmap esperando datos D30.

**Si tienes preferencias diferentes:** responde a las 20 preguntas con números (formato: "1.NO, 2.tu prop…") y ajusto.

---

*Documento maestro consolidado por Claude Opus 4.7 · 2026-05-02*
