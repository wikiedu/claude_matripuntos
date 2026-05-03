# 📊 Resumen visual — Matripuntos

**Fecha:** 2026-05-03 · **Última versión deployada:** `v2.0.5` · **Backend prod:** commit `d145859`, migración `20261101000000_v2_0_5_quick_wins` aplicada ✅

---

## 🚦 Leyenda

| Símbolo | Significado |
|:---:|---|
| 🟢 | **En producción y visible al usuario** — funciona end-to-end. |
| 🟡 | **En producción pero no integrado** — código mergeado, API arriba, falta enchufarlo al flujo visible. El usuario no lo ve. |
| 🔵 | **Listo pero detrás de feature flag o requiere acción manual** (seed, env var, etc.) |
| 🔴 | **Pendiente de implementar** — no hay código todavía. |
| 🟣 | **Pendiente decisión de producto** — esperando input antes de empezar. |

---

## 🟢 LO QUE EL USUARIO YA VE EN PRODUCCIÓN

```
┌─ AUTH & ONBOARDING ────────────────────────────┐
│  🟢 Signup / login / demo                        │
│  🟢 Onboarding 4 pasos + join couple             │
│  🟢 Invitaciones + partner linking               │
│  🟢 Password reset                               │
└────────────────────────────────────────────────┘

┌─ EVENTOS Y NEGOCIACIÓN ───────────────────────┐
│  🟢 Crear evento (entrada libre)                 │
│  🟢 Negociación V1 + V2 (counter, force)         │
│  🟢 Compensaciones y descuentos                  │
│  🟡 Picker del catálogo (componente listo,       │
│      NO conectado al formulario)  ← ¡aquí!      │
└────────────────────────────────────────────────┘

┌─ TAREAS ───────────────────────────────────────┐
│  🟢 CRUD + categorías + recurrentes              │
│  🟢 Logs + verificación + auto-accept 24h        │
│  🟢 Disputas con motivo                          │
│  🟢 Imagen prueba opcional (v2.0.5)             │
│      • subible desde "mis pendientes"            │
│      • visible al partner verificador            │
└────────────────────────────────────────────────┘

┌─ DASHBOARD ────────────────────────────────────┐
│  🟢 Frase del día rotativa                       │
│  🟢 Mood pareja + propuestas post-mood           │
│  🟢 Anniversary timer (v2.0.5)                  │
│  🟢 Balance & Level Hero                         │
│  🟢 Hoy: tareas, retos semanales, replays        │
└────────────────────────────────────────────────┘

┌─ GAMIFICACIÓN (v1.7) ─────────────────────────┐
│  🟢 Niveles pareja (10 niveles)                  │
│  🟢 Achievements 30                              │
│  🟢 Streaks diarios + semanales                  │
│  🟢 Retos semanales                              │
│  🟢 Replays                                      │
│  🟢 Web push (VAPID)                             │
└────────────────────────────────────────────────┘

┌─ CALENDARIO 360 (v2.0.1) ─────────────────────┐
│  🟢 Vista mes/semana/día/overview                │
│  🟢 CalendarEntry: events + tasks + services     │
│      + birthdays + holidays                      │
│  🟢 Recurrencia (RRULE simplificado)             │
│  🔵 Google Calendar OAuth (esqueleto, sync       │
│      diferido a v2.1)                            │
└────────────────────────────────────────────────┘

┌─ JOURNALING (v2.0.2) ─────────────────────────┐
│  🟢 /journal con prompts diarios                 │
│  🟢 Entries CRUD + reactions                     │
│  🟢 Retrospectivas semanales/mensuales           │
└────────────────────────────────────────────────┘

┌─ ANALYTICS PRO (v2.0.3) ──────────────────────┐
│  🟢 Overview + trends + equity                   │
│  🟢 Heatmap 24×7                                 │
│  🟢 Insights heurísticos                         │
│  🟢 Invariantes matemáticos garantizados         │
│      (sum día = sum semana = sum mes)            │
└────────────────────────────────────────────────┘

┌─ SETTINGS ─────────────────────────────────────┐
│  🟢 Perfil + avatar                              │
│  🟢 Pareja + hijos + mascotas                    │
│  🟢 Notificaciones                               │
│  🟢 Reglas de puntos (RuleProposal V1)           │
│  🟡 Propuestas pendientes (panel listo,          │
│      NO hay UI para CREAR propuestas)  ← ¡aquí! │
│  🟢 Idioma & tema (sólo ES)                      │
│  🟢 Privacidad: export + delete account          │
└────────────────────────────────────────────────┘
```

---

## 🟡 EN PRODUCCIÓN PERO NO INTEGRADO

> Código + API en prod, pero falta enchufarlo a un flujo visible.

| Feature | Qué falta para que se vea | Esfuerzo |
|---|---|---|
| **🟡 Picker del catálogo de actividades** (v2.0.4) | Sustituir el "tipo libre" en el formulario de crear evento por `ActivityCatalogPicker`. Tras eso: hacer seed del catálogo global en prod. | 1 sesión (~1h) |
| **🟡 UI para crear ConfigurationProposal** (v2.0.4) | Añadir botón "Proponer cambio" en cada slider/regla de Settings. Hoy hay panel para ver/aceptar/rechazar pero no para *crear*. | 1 sesión (~2h) |
| **🟡 Refresh tokens con rotación** (v1.8 prep) | Backend listo. Activar al introducir mobile RN (v3.0). | Diferido |
| **🟡 Seed catálogo global en Supabase** | Ejecutar `npx ts-node prisma/seedActivityTemplates.ts` una vez contra Supabase. | 5 min manual |

---

## 🔵 LISTO PERO DESACTIVADO

| Feature | Estado | Cómo activar |
|---|---|---|
| Google Calendar sync | OAuth scaffolding | Implementar sync engine (v2.1) |
| Push notifications PWA | VAPID + lib `web-push` | Implementar scheduler real (v2.1) |
| Email transaccional | Resend integrado | Activar templates (v2.1) |

---

## 🔴 PENDIENTE DE IMPLEMENTAR

```
v2.0.6 Refinos catálogo  🤔 Por decidir tras D30
  ├─ Picker en EventCreate (sustituye entrada libre)
  ├─ Contraoferta en propuestas (hoy sólo accept/reject)
  └─ "Proponer cambio" inline en cada slider de Settings

v2.1 Conectados  📝 Spec aprobado
  ├─ Push real PWA
  ├─ Google Calendar bidireccional
  ├─ Email transaccional (Resend)
  ├─ Export CSV/PDF
  ├─ ICS feed
  └─ Sistema de referidos

v2.2 Multiidiomas  🧠 Brainstorm pendiente
  ├─ react-i18next + locales es/en/ca/pt
  ├─ User.locale + toggle Settings
  ├─ Prompts journal localizados
  ├─ Plantillas email localizadas
  └─ name_i18n JSON en ActivityTemplate

v3.0 Premium  📝 Spec aprobado
  ├─ Stripe Checkout + Customer Portal
  ├─ Trial 14 días sin tarjeta
  ├─ AI assistant (Claude Haiku ZDR)
  ├─ Themes premium
  ├─ Anuario PDF anual (Puppeteer)
  ├─ Multi-couple history
  └─ React Native app
```

---

## 🟣 DECISIONES PENDIENTES (input de producto)

1. **¿Imágenes en cloud storage o data-URL?** Hoy v2.0.5 acepta data-URL <500KB. Migrar a S3/R2 sólo si D30 muestra uso intenso.
2. **¿UI inline para "proponer cambio"?** Tener un botón en cada slider, o mantener el panel separado.
3. **¿v2.1 (Conectados) o v2.2 (Multiidiomas) primero?** Retención vs ampliar mercado.
4. **¿Activar refresh tokens en webapp ya?** Listo en backend, complejidad innecesaria si no hay RN.
5. **¿"Alto impacto" en catálogo?** Bodas, comuniones, despedidas y funerales agrupados — ¿reorganizar?
6. **¿Picker sustituye o coexiste con entrada libre de eventos?** Higiene de datos vs libertad.

---

## 🛠️ PROBLEMAS TÉCNICOS CONOCIDOS

| Problema | Impacto | Estado |
|---|---|---|
| **CI E2E falla** (`type "datetime" does not exist`) | 🟡 No bloquea prod (Render desplegando OK) — sólo CI rojo. La migración `20260331152147_init` está escrita en sintaxis SQLite. | Fix pendiente: rescribir el init para Postgres o saltarse en CI postgres. |
| **Seed catálogo global no ejecutado en Supabase** | 🟠 El picker (cuando se enchufe) mostrará "No hay actividades" hasta que se haga seed. | One-time manual. |
| **Caché del navegador del usuario** | 🟢 Lo más probable detrás del "no veo cambios". | Hard-refresh (Cmd+Shift+R) o Ctrl+F5. |

---

## 📈 Versiones — línea de tiempo

```
MVP1  v1.1  v1.2  v1.3  v1.4  v1.4.1  v1.5  v1.5.1  v1.6.x
 ✅    ✅    ✅    ✅    ✅    ✅      ✅    ✅      ✅

v1.7   v2.0.1   v2.0.2   v2.0.3   v2.0.3.1
 ✅     ✅       ✅       ✅       ✅

v2.0.4 (catálogo + consenso)        ✅ prod 2026-05-03
v2.0.5 (anniversary + image proof)  ✅ prod 2026-05-03 ← AQUÍ
─────────────────────────────────────────────────────────────
v2.0.6 (refinos)         🤔 Tras D30
v2.1   (Conectados)      📝 Spec listo, sin empezar
v2.2   (Multiidiomas)    🧠 Brainstorm pendiente
v3.0   (Premium)         📝 Spec listo, sin empezar
```

---

## ✅ Cómo verificar que el deploy te llega

1. **Hard refresh** del navegador: `Cmd+Shift+R` (Mac) o `Ctrl+F5` (Windows).
2. Abrir DevTools → Network → asegurar `Disable cache`.
3. Comprobar que el JS carga `index-DrTF_gkO.js` (la build de v2.0.5).
4. En el dashboard debería aparecer la **AnniversaryCard** (si no tienes fecha fijada, dirá "¿Cuándo empezasteis juntos?").
5. En Tasks, en "Mis tareas pendientes de verificación", debería aparecer "📸 Añadir foto de prueba (opcional)".
6. En Settings → "🤝 Propuestas pendientes" debería existir la sección (estará vacía por ahora).
