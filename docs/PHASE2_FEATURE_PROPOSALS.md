# PHASE2_FEATURE_PROPOSALS — Módulo D · Brainstorming (v1)

> **Fecha:** 2026-06-12 · **Base:** `main` post-Módulos A/B/C de Fase 2 (v2.9.0+)
> **Método:** análisis del código real (archivo:línea verificados en esta sesión) + contexto de
> producto (CLAUDE.md §1/§7/§8/§9, `docs/STATUS.md`). **Sin código** — solo propuestas.
> Esfuerzo: **S** (<1 sesión) · **M** (1-2 sesiones) · **L** (3+ sesiones / sprint propio).

---

## D.1 — Flujo de negociación

### Situación actual
- Flujo: draft → "Enviar Propuesta" (`EventNegotiationCard.tsx:229-235`) → el partner acepta/rechaza desde el card (`EventNegotiationCard.tsx:239-262`, con ConfirmDialog) o contraoferta desde `ActivityDetail.tsx:327-389` (form inline de puntos + mensaje).
- Límite de rondas visible **solo en el card**: `Ronda {X}/{maxRounds}` (`EventNegotiationCard.tsx:201`). En `ActivityDetail` no hay contador.
- Forzar: bien resuelto desde v2.5.2 — botón "Forzar y pagar (X pts)" + ConfirmDialog danger con preview e irreversibilidad (`ActivityDetail.tsx:411-444`).
- Historial: existe en ambos sitios (`ActivityDetail.tsx:293-323`, toggle en card `:295-312`) pero **no muestra quién propuso cada ronda ni cuándo** — solo responseType + puntos + mensaje.
- `CounterOfferSheet.tsx` existe pero `ActivityDetail` usa un form inline propio (deuda menor).

### Problema
1. Una negociación pendiente **no expira nunca** y la UI no comunica cuánto lleva esperando ("Esperando respuesta" sin timestamp, `ActivityDetail.tsx:394-402`). Negociaciones zombi se acumulan en silencio.
2. El historial es ilegible como conversación: sin autor ni fecha por ronda, el usuario no puede reconstruir "quién pidió qué".
3. Copy "Forzar aceptación" (`ActivityDetail.tsx:436`) suena a "obligar al partner a aceptar" cuando significa "cerrar pagando yo".

### Propuestas
| # | Propuesta | Pros | Contras | Esfuerzo |
|---|---|---|---|---|
| 1 | **Polish del historial**: autor (avatar/nombre) + timestamp relativo por ronda, contador "Ronda X/Y" también en ActivityDetail header, renombrar diálogo a "Cerrar y pagar" | Bajo riesgo, solo frontend, mejora inmediata de claridad | No resuelve negociaciones zombi | **S** |
| 2 | **Caducidad suave de negociación**: a los 7 días sin respuesta → notificación al respondedor + badge "lleva X días" en card; a los 14 → estado `stale` con CTA "recordar / retirar propuesta" | Cierra el ciclo de vida; reutiliza notificationService | Toca backend (cron o check lazy en GET); decidir política de producto (¿auto-rechazo? mejor no) | **M** |
| 3 | **Wizard de negociación** con pasos explícitos (revisar → decidir → confirmar) | Más didáctico para usuarios nuevos | Sobre-ingeniería: el flujo actual ya son 2-3 taps; añade fricción a usuarios recurrentes | **M-L** |

### Recomendación
**Propuesta 1 ya** (quick win frontend) + **Propuesta 2** como pieza de la siguiente versión de producto. Descartar el wizard (3): el problema no es el nº de pasos sino la legibilidad del estado. Nada de esto toca `pointsCalculator` ni rutas V1.

---

## D.2 — Gamificación: engagement

### Situación actual
- **Retos semanales**: 5 tipos (`balance`, `verify`, `diversity`, `no_dispute`, `high_impact`), selección determinista por hash (coupleId + weekStart), dificultad escalada por nivel, recompensa 50-100+ XP (`challengeService.ts:24-68`).
- **Streaks**: daily con gracia 24h30m + **streak freeze** 1×/semana (notifs "🧊 protegida" / "💔 rota"); weekly = ≥3 días activos (`gamificationService.ts:141-220`, `streakService.ts:48-111`).
- **XP/nivel**: 10 niveles (100→100k). Fuentes: 0.5×|transacción|, achievements (20-10.000 XP), 2 XP/día de racha, 10 XP/semana activa, multiplicadores por racha (7d ×1.3 · 30d ×1.75 · 90d ×2.0).
- **Achievements V2**: 30 definiciones en 6 categorías (first/streak/balance/collab/diversity/hito).
- **Replays**: 4 tipos pasivos (anniversary, best day, balance record, first event) — info-cards, sin celebración activa.

### Problema
1. **Curva XP lenta en el tramo medio**: con uso normal (~5 tareas/semana), Lv3→Lv6 son ~10 meses. El nivel deja de ser feedback y pasa a ser ruido entre el mes 3 y el año.
2. **Un solo reto por semana, impuesto**: sin elección ni meta propia. El reto que no encaja con la semana de la pareja (ej. `high_impact` en semana tranquila) se ignora.
3. Celebraciones limitadas: LevelUpModal + PointsBurst existen, pero completar un reto o cerrar una racha semanal no celebra nada.

### Propuestas
| # | Propuesta | Pros | Contras | Esfuerzo |
|---|---|---|---|---|
| 1 | **Meta semanal elegible**: lunes la app ofrece 2-3 retos candidatos (del pool de 5 + variantes) y la pareja elige 1 (consenso ligero: el primero que elige fija, el otro puede cambiar hasta el martes) | Agencia = engagement; reusa challengeService casi entero | Pequeño cambio de schema (config en CoupleChallenge ya tiene JSON) | **M** |
| 2 | **Celebración de cierre de reto/racha semanal**: card animada estilo LevelUpModal al completar reto + confetti, y "resumen de la semana" el domingo (reusa digest scheduler v2.2.5) | Refuerzo positivo barato; infra ya existe | Riesgo de saturar si hay muchas celebraciones — limitar a 1/día | **S** |
| 3 | **Re-tuning curva XP** (comprimir thresholds medios o subir XP/transacción) | Arregla el valle de los meses 3-12 | Migración de niveles ya otorgados (precedente: v2.1.0 lo hizo); riesgo de devaluar progreso de parejas activas | **M** |
| 4 | Torneos pareja-vs-pareja / leaderboard global | Novedad competitiva | **Contradice el ADN del producto** (cooperación intra-pareja, privacidad asimétrica del red-balance); requiere masa crítica de usuarios | **L** — descartar por ahora |

### Recomendación
**Propuesta 2 (S)** primero — máximo retorno emocional por línea de código. Luego **1 (M)**. La 3 solo con datos de telemetría que confirmen el valle (ver D.7: hoy no hay funnel data). La 4 se aparca: la comparativa anónima agregada (D.8) es la versión compatible con el producto.

---

## D.3 — Push notifications: strategy

### Situación actual
**Todo el backend existe y nada del frontend lo activa.** Verificado en esta sesión:
- `useWebPush.ts` tiene `subscribe()`/`unsubscribe()` completos con estados (`idle/unsupported/denied/subscribing/subscribed/error`) y **0 consumidores** (grep: ningún componente importa `useWebPush`).
- Backend completo: `/api/notifications/push/*` (VAPID), `webPushService`, preferencias por categoría con 3 tiers + quiet hours (v2.2.4), digest scheduler diario (v2.2.5), `WEB_PUSH_ENABLED=true`.
- Es decir: la inversión de v1.7→v2.2.5 en push está **al 95% y rinde 0%** porque ningún usuario puede suscribirse.

### Problema
El único eslabón que falta es UI de opt-in. Cada día sin él, el digest scheduler corre para 0 suscriptores.

### Propuestas
| # | Propuesta | Pros | Contras | Esfuerzo |
|---|---|---|---|---|
| 1 | **Toggle en Settings → Notificaciones** que llama `useWebPush().subscribe()` + estados (denied → instrucciones de navegador; unsupported → ocultar) | Cierra el eslabón con mínimo código; ya está planificado como **E.5** | Descubrimiento pasivo: solo lo activa quien entra en Settings | **S** |
| 2 | Propuesta 1 + **prompt contextual post-acción**: tras la primera negociación enviada o primera tarea por verificar, banner "¿Quieres enterarte cuando responda X?" → subscribe | Opt-in en el momento de máxima motivación (mejor tasa que un toggle frío) | Hay que elegir bien el trigger para no ser intrusivo | **S+S** |
| 3 | Step de onboarding "¿Recibir notificaciones?" | Cobertura máxima | El peor momento para pedir permiso de navegador (usuario sin contexto, alta tasa de denied permanente) | **S** — descartar |

### iOS
Safari iOS solo permite push a **PWA instalada** (iOS 16.4+). Estrategia: el toggle de Settings detecta iOS no-instalado y muestra primero el banner de instalación (sinergia directa con **E.2** PWA install prompt). No intentar `Notification.requestPermission()` fuera de standalone en iOS.

### Recomendación
**1 + 2.** Implementar 1 dentro de E.5 (ya en cola) y añadir el prompt contextual en el sprint siguiente con telemetría de aceptación. Eventos que deben generar push (ya soportados por las categorías de v2.2.4): negociación nueva/respondida (critical), tarea por verificar (critical), reto nuevo (digest), racha en riesgo (off por defecto).

---

## D.4 — Analytics Pro: utilidad real

### Situación actual
- **Básico**: barras semanales, reparto por macro-categoría (con badge ⚠️ si gap ≥30%), evolución de saldo 30d, tiempo invertido.
- **Pro** (tras `PremiumOverlay`, dismissible por sesión; `isPremium` hardcoded `false` en `Analytics.tsx:21`): heatmap 7×24, completion rate, equity gauge 0-100, top categorías, MonthlyInsightCard.
- **Insights**: 6 reglas heurísticas server-side (`insightsGenerator.ts:31-196`): top categoría, tendencia mensual, equidad en 3 bandas, franja horaria, verificaciones pendientes, inactividad. Máx 3 cards.
- Hay "Resumen 30 días" numérico (`AnalyticsProSection.tsx:82-93`) pero no comparativa lado a lado ni nada que salga de la app.

### Problema
Todo es **descriptivo, no accionable**: dice "diferencia de 50 puntos" pero no por qué ni qué hacer. Y vive enterrado en una pestaña — el usuario tiene que ir a buscarlo. El insight más valioso del producto (¿estamos equilibrados?) no llega solo.

### Propuestas
| # | Propuesta | Pros | Contras | Esfuerzo |
|---|---|---|---|---|
| 1 | **Resumen semanal push** (domingo tarde): "Esta semana: 23 MP tú · 31 MP Ana · equilibrio 87/100 · 🏆 reto cumplido" con deep-link a Analytics — **reusa el digest scheduler v2.2.5 + insightsGenerator tal cual** | Analytics que viene a ti; infra ya existe; sinergia con D.3 | Depende de D.3 (suscriptores push); versión email requiere Resend (v2.1) | **S-M** |
| 2 | **Insights accionables**: a cada regla añadir `cta: {label, route}` ("Diferencia alta → Nivelar: estas 3 tareas de Hogar valen 12 MP" → /tasks) y causa breve ("Ana hizo 8 tareas más en Cuidado") | Convierte el panel en asistente; diferenciador del producto | Las heurísticas de causa requieren cuidado para no sonar acusatorias (tono = el de redBalanceService) | **M** |
| 3 | **Equity por categoría** (gauge global desglosado: Hogar 80/20 ⚠️, Cuidado 50/50 ✓) + comparativa mes vs mes anterior lado a lado | Responde el "por qué" del desequilibrio | analyticsAggregator ya agrupa por categoría — coste moderado; más densidad en una página ya densa | **M** |

### Recomendación
**1 → 2 → 3** en ese orden. La 1 es la palanca de retención más barata del backlog (todo el pipeline existe). Nota premium: decidir si el resumen semanal es free (retención) y el desglose causal es Pro (monetización) — encaja con el overlay actual.

---

## D.5 — Supabase Realtime vs polling

### Situación actual
- `AuthedLayout.tsx:41` — `loadUserData()` cada 60s (salta tick si sheet abierto).
- `AuthedLayout.tsx:56` — notifications via React Query `refetchInterval: 30_000` (idem sheetLock).
- Al llegar notif nueva se invalidan balance/eventos/tareas/gamificación (v2.5.3) — el polling de notifs ya actúa como "señal de cambio" barata.
- `refetchOnWindowFocus: false` global (v2.3.5).

### Análisis coste/beneficio
- **Time-sensitive real**: negociación nueva/respondida, tarea por verificar, partner se une. Todo lo demás (analytics, achievements, calendar) tolera 30-60s sin que nadie lo note.
- **Latencia actual efectiva**: ≤30s para lo importante (la cadena notif→invalidate ya existe). El beneficio de Realtime sería pasar de ~15s medios a ~1s. Para una app de pareja (no chat), es marginal.
- **Coste Realtime**: dependencia `@supabase/supabase-js` en frontend (~25KB gzip que B.1 acaba de pelear por quitar), gestión de canales/reconexión/auth de canal por coupleId, y acoplamiento del frontend a Supabase (hoy solo el backend lo conoce — Render podría cambiar de DB sin tocar el front). Free tier: 200 conexiones concurrentes / 2M mensajes-mes — suficiente hoy, pero el límite de conexiones es el primero que se golpea al crecer.
- **Alternativa ya en cola**: cuando D.3 active push, el SW puede invalidar queries al recibir push (push = señal realtime gratis, sin conexión persistente).

### Propuestas
| # | Propuesta | Pros | Contras | Esfuerzo |
|---|---|---|---|---|
| 1 | **No adoptar Realtime ahora**; usar push (D.3) como señal de invalidación y mantener polling como fallback; opcionalmente bajar `loadUserData` a 120s para ahorrar batería/requests | Cero dependencias nuevas; aprovecha D.3; reversible | Latencia sigue siendo segundos, no ms | **S** |
| 2 | Realtime selectivo solo `Notification` (userId scope) + reducir polling a 5m | Latencia ~1s en lo que importa | Todo el coste de infra para un solo caso; bundle +25KB | **M** |
| 3 | Realtime para `Notification` + `Event` (status) + `TaskLog` | Experiencia "viva" completa | Mayor acoplamiento; RLS/auth de canales con coupleId requiere diseño cuidadoso (hoy el aislamiento es app-level — regla NO TOCAR) | **L** |

### Recomendación
**Propuesta 1.** Veredicto para G.3: **no favorable a corto plazo** — Realtime queda condicionado a (a) push activo y medido, y (b) señal de usuarios de que la latencia molesta. El riesgo de canales Realtime con aislamiento app-level (sin RLS) es además un argumento de seguridad para no precipitarse.

---

## D.6 — Sistema de puntos

### Situación actual
Fórmula multiplicativa (`base × tipo × franja × duración × hijos`, redondeo 0.5, cap 500) — fuente de verdad `pointsCalculator.ts` (**NO TOCAR**, testeado). Tareas recurrentes con base fija 1.0-2.0. Saldo = suma de `PointsTransaction` (los eventos son transferencias: el proposer paga → el sistema MP es de suma ~cero entre la pareja; las tareas verificadas sí inyectan MP).

### Problema(s) — hipótesis sin datos aún
1. **Asimetría de inyección**: las tareas crean MP (+2 cocina) y las actividades los mueven (18.5 MP una cena). Una pareja muy "tareas" infla ambos saldos; una muy "actividades" los polariza. No es bug — pero sin techo ni decaimiento, los números crecen para siempre y los importes pierden significado relativo ("inflación").
2. **Multiplicadores de franja** premian madrugada ×1.5 — correcto para ausencias (el que se queda asume más), pero nadie ha validado con uso real si incentiva lo deseado.
3. La consistencia no puntúa: hacer 1 tarea/día 30 días vale lo mismo en MP que 30 tareas un domingo. (La gamificación lo premia en XP, la economía no.)

### Propuestas
| # | Propuesta | Pros | Contras | Esfuerzo |
|---|---|---|---|---|
| 1 | **Medir antes de tocar**: query/script de distribución real (MP medios por transacción, saldo medio absoluto, ratio tareas/actividades por pareja) → informe D30 | La fórmula tiene tests y consenso; cambiarla a ciegas es el mayor riesgo del producto | No "arregla" nada todavía | **S** |
| 2 | **Bonificación de consistencia en XP, no en MP**: N semanas seguidas con ≥X tareas verificadas → bonus XP/achievement nuevo. **Nunca en MP** (romper la suma-cero de la economía crearía inflación real) | Premia constancia sin tocar pointsCalculator ni la economía | Es gamificación (D.2), no economía — no cambia percepción del saldo | **S** |
| 3 | **Decaimiento/normalización suave del saldo** (ej. reset estacional acordado, o "amnistía" negociada del exceso > umbral) | Ataca la inflación de verdad | Cambio de contrato económico — necesita consenso de pareja en producto y migración; alto riesgo de percepción de "me roban puntos" | **L** — solo con datos de 1 |

### Recomendación
**1 + 2 ahora.** La 3 únicamente si los datos de la 1 muestran saldos desbocados en parejas reales. Regla dura: cualquier bonificación nueva vive en XP/achievements; `pointsCalculator.ts` y la semántica de `PointsTransaction` no se tocan.

---

## D.7 — Onboarding

### Situación actual
- Creador: 6 pasos (Welcome → Profile → Pair → Rules → Categories → Done); con pareja ya vinculada, 5 (salta Pair). Invitee: 3-4 (JoinAccount → Avatar → Work[saltable]). PartnerCatchUp (4 pasos) cuando se une a pareja con historial.
- `DashboardTour` **sí se usa**: se dispara post-onboarding via localStorage (`Dashboard.tsx:78-81`).
- **Bug/deuda confirmada**: `StepCategories` obliga a seleccionar categorías pero `finish()` **no las persiste** (TODO en `Onboarding.tsx:140`). Paso obligatorio cuyo resultado se tira.
- **Cero telemetría de funnel**: 0 eventos en `pages/onboarding/` pese a existir `telemetry.ts` + catálogo `packages/shared/telemetry-events.ts`. No se puede saber la tasa de completado ni dónde se abandona.

### Problema
No sabemos si el onboarding es largo porque **no medimos**. Y mientras tanto hay un paso obligatorio (Categories) que no hace nada — fricción con coste cero de eliminar.

### Propuestas
| # | Propuesta | Pros | Contras | Esfuerzo |
|---|---|---|---|---|
| 1 | **Instrumentar el funnel**: evento por step (entered/completed/skipped) + completion final, en creador, invitee y catch-up | Desbloquea todas las demás decisiones de D.7 con datos; PostHog ya integrado | Ninguno relevante | **S** |
| 2 | **Resolver StepCategories**: o se persiste de verdad (cerrar el TODO) o se saca del flujo a Settings con un hint en StepDone ("ajusta categorías en Ajustes") | Elimina fricción muerta; honra la promesa de StepWelcome ("podrás ajustar todo después") | Decisión de producto: ¿las categorías iniciales importan para el día 1? (el catálogo global ya cubre) | **S** |
| 3 | **Onboarding "rápido" de 3 pasos** (Welcome → Profile → Pair) con Rules/Categories diferidos a un checklist post-login ("Completa vuestra configuración 2/4") | Time-to-value mínimo; patrón probado | Rules sí afecta puntos desde el día 1 (defaults razonables mitigan); rediseño mediano | **M** — solo tras datos de 1 |

### Recomendación
**1 + 2 ya** (ambas S, sin dependencias). La 3 se decide con 2-4 semanas de funnel data. PartnerCatchUp no tocar: es el paso mejor diseñado del flujo.

---

## D.8 — Features nuevas (evaluación de las 8 ideas del brief)

| Idea | Valor | Factibilidad técnica | Veredicto |
|---|---|---|---|
| **Acuerdos recurrentes** (plantillas de negociación para eventos que se repiten) | ALTO — el padel del martes se renegocia idéntico cada semana; elimina la fricción nº1 del uso continuado | Media: `ActivityTemplate` + `pointsApproved` (consenso v2.1.1) ya dan el 60%; falta "acuerdo" = template + puntos pactados + auto-creación opcional | ✅ **Top candidate** (M-L) |
| **Modo solo** (sin partner, auto-verificación) | MEDIO-ALTO — elimina la barrera de entrada dura (necesitas convencer a tu pareja para probar la app); funnel de adquisición | Media: el modelo ya tolera couple de 1 (flujo "empezar en solitario" existe en StepPair); falta auto-verify + ocultar UI de partner | ✅ Explorar (M) |
| **Modo vacaciones mejorado** (puntos congelados, no deuda) | MEDIO — v2.2.8 ya pausa streaks/digest; falta congelar expectativas de tareas recurrentes | Baja complejidad sobre lo existente | ✅ Quick win (S-M) |
| **Exportación PDF** (resumen mensual/anual) | MEDIO — ya está en spec v3.0 como gancho premium (Anuario) | Alta complejidad (Puppeteer en Render) — versión CSV/print-stylesheet primero | ⏸ Diferir a v3.0; CSV barato antes (S) |
| **Comparativa con parejas anónimas** ("estáis en el X% más equilibrado") | MEDIO — refuerzo positivo sin exponer a nadie | Media: agregados anónimos server-side; necesita masa crítica de parejas para percentiles honestos | ⏸ Guardar para cuando haya usuarios |
| **Historial de pareja** (timeline de hitos) | MEDIO — emocional, encaja con Journal/replays | Media: los datos existen (events, achievements, retrospectivas) | ⏸ Candidato v2.x emocional |
| **Widget iOS/Android** | BAJO hoy — requiere app nativa (Capacitor G.1 ni decidido) | Alta | ❌ Aparcar hasta post-Capacitor |
| **Categorías custom con pesos** | BAJO — `Category.isCustom` + Configuration ya cubren el 80%; pesos custom = más superficie de desequilibrio | Media | ❌ No justifica el coste |

### Propuestas libres (no listadas en D.x)
1. **"Nudge de verificación" inteligente (S)** — la tarea pendiente de verificar >24h ya se auto-acepta; antes de eso, un push/notif al verificador a las ~20h ("Ana marcó 'Cocina' — ¿lo confirmas?"). Reduce auto-accepts silenciosos que erosionan la confianza en el sistema. Depende de D.3.
2. **Check-in semanal de pareja guiado (M)** — ritual de 5 min los domingos: resumen de la semana (D.4-1) + 1 pregunta de retro (journalPromptsService ya tiene prompts) + proponer la meta de la semana (D.2-1). Une tres piezas existentes en un momento de uso con nombre propio. Diferenciador fuerte frente a "apps de tareas".
3. **Deep links de invitación más robustos (S)** — el flujo email por token (C.5) es la mejor arma de adquisición viral; pulir copy del email + landing `couple-preview` con datos reales del inviter aumenta conversión del segundo miembro (el momento más crítico del funnel).

---

## RANKING TOP 5

| # | Propuesta | Origen | Archivos a tocar | Sprint | Dependencias | Riesgo |
|---|---|---|---|---|---|---|
| **1** | **Activar push: toggle Settings + prompt contextual** | D.3 (+E.5, E.2 iOS) | `Settings.tsx`, `useWebPush.ts` (consumir), banner contextual en `ActivityDetail`/`Tasks`; backend ya completo | 1 sesión (S) | Ninguna — desbloquea D.4-1, D.5-1, nudge | Bajo — todo opt-in, infra probada |
| **2** | **Telemetría de onboarding + fix StepCategories** | D.7 | `pages/onboarding/*` (eventos), `Onboarding.tsx:140` (persistir o retirar step), `packages/shared/telemetry-events.ts` | 1 sesión (S) | Ninguna | Bajo — aditivo |
| **3** | **Resumen semanal push accionable** | D.4-1 + D.2-2 | `digestService`/`notificationDigestService`, `insightsGenerator.ts` (reuso), copy + deep-link | 1-2 sesiones (S-M) | #1 (suscriptores push) | Bajo — scheduler ya corre en prod |
| **4** | **Negociación: historial legible + caducidad suave** | D.1-1/2 | `ActivityDetail.tsx`, `EventNegotiationCard.tsx` (frontend S); `notificationService` + check lazy en GET events (M) | 1-2 sesiones | Ninguna (parte frontend) | Bajo frontend / Medio backend (política de expiración = decisión producto) |
| **5** | **Acuerdos recurrentes** (plantilla + puntos pactados + auto-creación) | D.8 | `ActivityTemplate` (schema: campos acuerdo), `activityTemplateService`, `recurrenceService` (reuso), UI en catálogo + `RequestActivity` | Sprint propio (M-L) | Ninguna técnica; spec de producto primero | Medio — toca creación de eventos; nunca toca pointsCalculator |

**Lógica del ranking:** 1-3 forman una cadena (push → datos → analytics que llega solo) donde cada pieza multiplica a la anterior y casi todo el backend ya existe. 4 es el polish de mayor visibilidad diaria. 5 es la feature nueva con mejor ratio valor/riesgo y la única que ataca la retención de largo plazo (uso repetido sin fricción).

**Decisiones que quedan para el usuario/producto:**
- D.1-2: ¿política de caducidad de negociación? (recomendado: recordatorio 7d, stale 14d, nunca auto-rechazo)
- D.4: ¿resumen semanal free y causalidad Pro? (recomendado: sí)
- D.6-1: ejecutar el script de distribución de MP antes de cualquier cambio económico
- D.7-2: ¿StepCategories se persiste o se retira del onboarding? (recomendado: retirar a Settings)
- D.8: ¿modo solo entra en roadmap como palanca de adquisición?
