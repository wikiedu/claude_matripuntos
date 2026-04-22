# Backend tests

## Niveles

- **Unitarios** (`test:unit`) — funciones puras, no tocan DB.
  Corren siempre, en local y en CI, sin setup extra.
  - `pointsCalculator.test.ts` — fórmula de puntos (franjas, duración, hijos, impacto, redondeo).
  - `insightHeuristic.test.ts` — generador de insights mensuales.

- **Integración** (`test:integration`) — requieren una **PostgreSQL local** porque `schema.prisma` declara `provider = "postgresql"`.
  - `analyticsService.test.ts`, `achievementEngine.test.ts`, `auth.test.ts`, `gamificationService.test.ts`, `recurringTaskService.test.ts`.

## Cómo correr los tests

```bash
# Solo unitarios (rápido, sin DB):
npm run test:unit

# Todo (requiere DB):
npm test
```

## Configurar DB para integración

1. Levanta Postgres local (Docker recomendado):
   ```bash
   docker run -d --name matripuntos-test-db \
     -e POSTGRES_PASSWORD=test -e POSTGRES_DB=matripuntos_test \
     -p 5433:5432 postgres:15
   ```

2. Crea `src/backend/.env.test`:
   ```
   DATABASE_URL="postgresql://postgres:test@localhost:5433/matripuntos_test"
   JWT_SECRET="test-secret"
   ```

3. Aplica migraciones a la DB de test:
   ```bash
   DATABASE_URL="postgresql://postgres:test@localhost:5433/matripuntos_test" \
     npx prisma migrate deploy
   ```

4. Corre la batería completa:
   ```bash
   npm test
   ```

`tests/setup.ts` carga `.env.test` primero y cae a `.env` si no existe, así que los mismos tests valen para local y CI.
