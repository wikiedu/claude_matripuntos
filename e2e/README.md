# Matripuntos · E2E Playwright suite

> v1.6.1 · 23 specs · 58 tests (chromium + webkit). Workspace npm: `@matripuntos/e2e`.

## Estructura

```
e2e/
├── package.json              workspace npm con @playwright/test
├── playwright.config.ts      projects chromium + webkit, retries CI
├── tsconfig.json
├── helpers/
│   ├── createCouple.ts       Crea couple+2users vía API directa
│   └── signInUser.ts         Login UI + dismiss cookie banner
├── specs/
│   ├── auth-{signup,login,signup-joincode,logout-refresh}.spec.ts
│   ├── onboarding-{creator,invitee}.spec.ts
│   ├── activity-{create-accept,counter-rounds,force,reject}.spec.ts
│   ├── task-{log-verify,log-dispute}.spec.ts
│   ├── mood-{set-see,expire,history}.spec.ts
│   ├── phrase-cascade.spec.ts
│   ├── avatar-picker.spec.ts
│   ├── settings-{leave-couple,delete-account}.spec.ts
│   ├── smoke-{bottom-nav,fab-actions}.spec.ts
│   ├── privacy-cookie-consent.spec.ts
│   └── legal-pages.spec.ts
└── README.md
```

## Ejecutar localmente

```bash
# 1) Backend + frontend en puertos E2E (DB efímera)
cd src/backend && DATABASE_URL=file:./e2e-test.db PORT=3001 NODE_ENV=test npm run dev &
cd src/frontend && VITE_API_BASE=http://localhost:3001 npm run dev -- --port 5174 &

# 2) Playwright
cd e2e
npx playwright install chromium webkit   # primera vez
npm run test                              # todos
npm run test:chromium                     # solo chrome
npx playwright test specs/auth*           # subset
```

Desde la raíz del monorepo:
```bash
npm run e2e
npm run e2e:chromium
npm run e2e:webkit
```

## Estado actual

- **Foundation**: helpers `createCouple` (API) + `signInUser` (UI).
- **Verdes garantizadas**: legal-pages (3), privacy-cookie-consent (3), smoke-bottom-nav (1).
- **API-only verdes en cuanto backend accesible**: activity-{create-accept, counter-rounds, force, reject},
  task-log-{verify, dispute}, mood-{expire, history}, auth-{signup, login}.
- **UI-dependientes con `test.skip` defensivo si testid falta**:
  settings-{leave-couple, delete-account}, smoke-fab-actions, avatar-picker,
  phrase-cascade, mood-set-see, onboarding-creator, auth-signup-joincode,
  auth-logout-refresh.

Las skipped se reactivan automáticamente cuando se añaden los testids — la spec
documenta el flujo y deja huella.

## CI

Workflows `e2e-chromium` y `e2e-webkit` corren en `.github/workflows/ci.yml`,
con caché de Playwright browsers y artifact upload de HTML report en fallo.

## Notas

- Las specs API-only no requieren UI: filtra con `--grep "vía API"` para correr
  solo contract checks de los endpoints sin levantar frontend.
