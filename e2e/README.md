# Matripuntos · E2E Playwright suite

> v1.6.1 · Setup inicial. Foundation lista; resto de specs (22 totales) pendientes.

## Estructura

```
e2e/
├── playwright.config.ts       Config con projects chromium + webkit
├── helpers/
│   ├── createCouple.ts        Crea couple+2users vía API directa
│   └── signInUser.ts          Login UI + dismiss cookie banner
├── specs/
│   ├── privacy-cookie-consent.spec.ts   ✅ 3 tests
│   ├── legal-pages.spec.ts              ✅ 3 tests (/privacy /terms /cookies)
│   └── smoke-bottom-nav.spec.ts         ✅ 1 test
└── README.md
```

## Ejecutar localmente

```bash
# 1. Asegurar que backend + frontend están en :3001 + :5174 respectivamente
cd src/backend && DATABASE_URL=file:./e2e-test.db PORT=3001 NODE_ENV=test npm run dev &
cd src/frontend && VITE_API_BASE=http://localhost:3001 npm run dev -- --port 5174 &

# 2. Run Playwright (instala browsers la primera vez)
cd e2e
npx playwright install chromium webkit
npx playwright test                   # todos
npx playwright test --project=chromium  # solo Chrome
npx playwright test specs/privacy     # subset
```

## Specs pendientes (próxima sesión)

| Spec | Bloque |
|---|---|
| auth-signup, auth-signup-joincode, auth-login, auth-logout-refresh | Auth |
| onboarding-creator, onboarding-invitee | Onboarding |
| activity-{create-accept,counter-rounds,force,reject} | Activity |
| task-{log-verify,log-dispute} | Task |
| mood-{set-see,expire,history} | Mood |
| phrase-cascade | Phrase |
| avatar-picker | Avatar |
| settings-{leave-couple,delete-account} | Settings |
| smoke-fab-actions | Smoke |

19 specs pendientes para completar las 22 del plan v1.6.1.

## CI

Pendiente: añadir jobs `e2e-chromium` + `e2e-webkit` en `.github/workflows/ci.yml`
con caché de Playwright browsers + artifact upload de reports en fallo.
