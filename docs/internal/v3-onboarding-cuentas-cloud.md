# Onboarding cuentas cloud — Guía paso a paso

> Para: ejecutar v3.0 (Cloudflare) y v3.0.1 (Railway + Neon) del spec mobile-pwa-strategy.
> Fecha guía: 2026-05-12. Si los UIs cambian, la lógica sigue siendo válida; busca botones equivalentes.
> Usuario destinatario: Eduardo, founder, no-técnico.

## Índice

1. [Cloudflare — account + dominio + Pages](#1-cloudflare) — necesario para Fase 0a (v3.0)
2. [Render — upgrade a Starter](#2-render-starter) — necesario para Fase 0a (v3.0)
3. [Railway — account + project](#3-railway) — necesario para Fase 0b (v3.0.1)
4. [Neon — account + project + branches](#4-neon) — necesario para Fase 0b (v3.0.1)
5. [Backblaze B2 (opcional)](#5-backblaze-b2) — backups offsite
6. [Qué credenciales necesitaré que me pases](#credenciales-que-necesitaré)

---

## 1. Cloudflare

### 1.1 Crear cuenta

1. Abre **https://dash.cloudflare.com/sign-up** en tu navegador.
2. Email: `eduhand92@gmail.com`. Password: usa tu gestor (1Password, Bitwarden, lo que uses). Marca aceptación de términos.
3. Click **Sign Up**.
4. Cloudflare te envía un email de verificación → revisa tu inbox y click el link.
5. **Activar 2FA** (importante porque vamos a tener producción aquí):
   - Dashboard → arriba a la derecha tu avatar → **My Profile** → pestaña **Authentication** → **Two-Factor Authentication** → click **Configure**.
   - Escanea el QR con Google Authenticator / Authy / 1Password.
   - Cloudflare te muestra **10 códigos de respaldo**. **Guárdalos en tu password manager**. Cada uno es de un solo uso, te salvan si pierdes el móvil.

### 1.2 Añadir el dominio matripuntos.com

1. Dashboard Cloudflare → arriba a la izquierda click **Add a site** (o el botón **+ Add**).
2. Introduce `matripuntos.com` (sin `https://`, sin `www`). Click **Continue**.
3. **Seleccionar plan:** elige **Free** (al final del listado). Click **Continue**.
4. Cloudflare escanea automáticamente los registros DNS actuales de keepitup.io. Tras 10-60 segundos te muestra una tabla con todos los registros encontrados:
   - `A` `matripuntos.com` → IP de keepitup
   - `CNAME` o `A` `www` → matripuntos.com o IP
   - Registros `MX` para email (si tienes email en el dominio)
   - Posibles `TXT` para SPF/DKIM
5. **Importantísimo:** verifica que los registros `MX` (email) tienen la columna **Proxy status** = **DNS only** (nube gris). NO en proxy (naranja). Si están naranjas, click la nube para cambiarlos.
6. Los registros `A` y `CNAME` del dominio principal — déjalos como están de momento (Cloudflare por defecto los marca proxied=ON nube naranja, lo cual es correcto para CF Pages después).
7. Click **Continue** al final de la lista.
8. **Cambio de nameservers** — Cloudflare te muestra **2 nameservers asignados a tu zona**. Algo así:
   ```
   aria.ns.cloudflare.com
   kurt.ns.cloudflare.com
   ```
   (Los tuyos serán nombres distintos. Cópialos a un sitio seguro — los necesitas en el siguiente paso.)
9. **NO cambies los nameservers todavía**. Click **Continue** y deja Cloudflare en este estado. Vamos a montar Cloudflare Pages primero (1.3) y luego cambias nameservers (1.5).

### 1.3 Conectar GitHub a Cloudflare Pages

1. Dashboard CF → sidebar izquierdo **Workers & Pages**.
2. Click **Create application** → pestaña **Pages** → **Connect to Git**.
3. **Authorize GitHub**: Cloudflare te lleva a github.com a autorizar. Click **Authorize Cloudflare**. Si te pregunta a qué repos darle acceso, elige **Only select repositories** y selecciona `wikiedu/claude_matripuntos`. Confirma.
4. De vuelta en CF Pages → te muestra una lista de repos. Selecciona **claude_matripuntos**. Click **Begin setup**.
5. **Pantalla "Set up builds and deployments":**
   - **Project name:** `matripuntos` (todo en minúsculas, sin espacios).
   - **Production branch:** `main`.
   - **Framework preset:** déjalo en **None**.
   - **Build command:** copia exactamente esto:
     ```
     cd src/frontend && npm ci && npm run build
     ```
   - **Build output directory:** copia exactamente:
     ```
     src/frontend/dist
     ```
   - **Root directory:** déjalo vacío (raíz del repo).
6. Click **Environment variables (advanced)** para expandir y añadir las variables del frontend:

   | Variable name | Value | Notas |
   |---|---|---|
   | `NODE_VERSION` | `20` | obligatorio |
   | `VITE_API_URL` | `https://matripuntos-api.onrender.com` | de momento sigue siendo Render |
   | `VITE_SENTRY_DSN` | (copia el valor de tu .env.production actual) | si tienes Sentry frontend |
   | `VITE_POSTHOG_KEY` | (copia el valor actual) | si usas PostHog |
   | `VITE_POSTHOG_HOST` | `https://eu.posthog.com` o lo que tengas | |

   Si no recuerdas algún VITE_*, búscalo así (en tu máquina local):
   ```bash
   cat .env.production 2>/dev/null || cat src/frontend/.env.production 2>/dev/null
   ```

7. Click **Save and Deploy**. CF empieza el build (toma 2-5 min la primera vez).
8. Cuando termine, CF te asigna una URL temporal del estilo `matripuntos-abc.pages.dev`. **Apunta esa URL exacta** — la necesitamos para verificar.
9. Abre esa URL en tu navegador → debe cargar Matripuntos como hoy (login, dashboard, etc.). Si NO carga, revisa el log de build en CF dashboard.

### 1.4 Custom domain en CF Pages

1. Dentro del proyecto CF Pages (matripuntos) → pestaña **Custom domains** → **Set up a domain**.
2. Introduce `matripuntos.com`. Click **Continue**.
3. CF te muestra que añadirá un registro CNAME en la zona DNS. Click **Activate domain**.
4. Repite con `www.matripuntos.com`.
5. Estado quedará en "Verifying" hasta que cambies los nameservers (siguiente paso). Eso es normal.

### 1.5 Cambiar nameservers en keepitup.io (PASO IRREVERSIBLE de propagación 1-24h)

⚠️ **Hacer SOLO cuando 1.3 y 1.4 estén configurados y el CF Pages preview funciona.**

1. Entra a tu panel **keepitup.io** (la URL típica de su panel; si no la recuerdas, busca el email de bienvenida que te enviaron cuando contrataste).
2. Sección de **Dominios** o **DNS** → busca `matripuntos.com` → opción **Nameservers** o **Servidores de nombres**.
3. Hoy probablemente verás algo como:
   ```
   ns1.keepitup.io
   ns2.keepitup.io
   ```
4. **Cámbialos por los 2 que Cloudflare te dio en 1.2.8.** Solo esos dos (si keepitup.io te permite 3-4, deja solo 2).
5. Guarda los cambios. Anota la hora exacta del cambio en tu calendario (sirve si algo tarda más de lo esperado).
6. Espera. Cloudflare verifica automáticamente cuando los nameservers están propagados. Recibirás un email "Your domain matripuntos.com is now active on Cloudflare". Puede tardar de 5 min a 24h. **Suele tardar 1-3h** en la práctica.
7. Mientras tanto, tu web SEGUIRÁ FUNCIONANDO (DNS sigue funcionando con los nameservers viejos hasta que propague). No hay downtime esperado.

### 1.6 Verificar tras propagación

Una vez Cloudflare confirma "active":

1. Abre `https://matripuntos.com` en una **ventana de incógnito** (para evitar cache).
2. Debe seguir cargando Matripuntos exactamente igual que antes.
3. F12 → Network → recarga → click cualquier petición → Headers → busca `server: cloudflare`. Eso confirma que CF está sirviendo.
4. CF Pages "Custom domains" debe mostrar `matripuntos.com` con estado **Active** (verde).

✅ Si todo OK, dame: la URL `*.pages.dev` que CF te asignó. Con eso configuro el deploy automático y deshabilito FTP.

---

## 2. Render Starter

Esto solo es cambiar el plan en el dashboard. 2 minutos.

1. Abre **https://dashboard.render.com** y haz login con la cuenta donde tienes Matripuntos.
2. Click en el service del backend (el nombre será algo como `matripuntos-api` o `matripuntos-backend`).
3. Sidebar izquierda del service → **Settings**.
4. Scrollea hasta encontrar **Instance Type** o **Plan**.
5. Cambia de **Free** a **Starter** ($7/mes).
6. Render te pide confirmación + datos de billing si no los tienes. Introduce tarjeta. **Confirma** el cambio.
7. NO debería haber re-deploy automático — el cambio es solo de billing. El service sigue corriendo igual pero ya NO se duerme tras 15 min idle.
8. Anota la fecha del primer charge (Render facturará a esa fecha cada mes).

Para verificar que ya no duerme:
```bash
# Esperar 30 min sin hacer requests, luego:
time curl https://matripuntos-api.onrender.com/api/health
# Esperado: < 1 segundo
```

✅ Si tarda < 1 segundo tras 30 min idle, Render Starter está OK.

---

## 3. Railway

Este sirve para Fase 0b (más adelante). Puedes crearla ya o cuando lleguemos a esa fase. Recomiendo crearla ya para no bloquear cuando toque.

### 3.1 Crear cuenta

1. Abre **https://railway.app**.
2. Click **Start a New Project** (o **Login** arriba a la derecha si ya estás).
3. **Sign in with GitHub** (es lo más limpio porque luego conectarás el repo). Autoriza Railway a leer tus repos.
4. Confirma tu email si te lo pide.
5. **Plan billing:** Railway tiene un crédito free de $5/mes para empezar, pero para tener uso "ilimitado" necesitas plan Hobby ($5/mes).
   - Click avatar arriba derecha → **Account Settings** → **Plans** → **Upgrade to Hobby**.
   - Introduce tarjeta. Confirma.

### 3.2 (CUANDO LLEGUEMOS A FASE 0B) Crear project del backend

⚠️ Esto se hace **cuando vayamos a ejecutar v3.0.1**, no antes. Pero los pasos son:

1. Railway dashboard → **+ New Project**.
2. **Deploy from GitHub repo** → selecciona `wikiedu/claude_matripuntos`.
3. Railway detecta que es Node. En la siguiente pantalla:
   - **Root Directory:** `src/backend`.
   - **Watch Paths:** déjalo vacío (auto-detect).
4. Railway empieza un primer deploy que probablemente falla porque le faltan env vars. NORMAL.
5. **Variables** (sidebar del service) → **+ New Variable** o **Raw Editor**. Copia/pega todas las variables del backend. Yo te paso la lista exacta cuando llegue el momento, pero anticipa que serán ~15 variables (DATABASE_URL, JWT_SECRET, VAPID keys, FRONTEND_URLS, SENTRY_DSN_BACKEND, RESEND_API_KEY, etc.).
6. Trigger redeploy. Verifica `/api/health` responde 200.

### 3.3 Custom domain Railway

Cuando el service esté funcionando:

1. Settings del service → **Networking** → **Custom Domain** → introduce `api.matripuntos.com`.
2. Railway te da un CNAME target (algo como `<service>.up.railway.app`).
3. Mientras Railway emite SSL, ve a Cloudflare DNS → crea CNAME:
   - **Name:** `api`
   - **Target:** el CNAME target que Railway dio
   - **Proxy status:** ON (orange cloud)
4. Espera 1-10 min a que Railway confirme SSL emitido (verás el dominio cambiar a estado green/active).

---

## 4. Neon

### 4.1 Crear cuenta y primer project

1. Abre **https://console.neon.tech**.
2. **Sign up** con email o **Continue with GitHub** (recomiendo GitHub).
3. Confirma email si te lo pide.
4. **Create your first project:**
   - **Project name:** `matripuntos`
   - **Region:** elige **AWS / Europe (Frankfurt)** o **AWS / Europe (Ireland)** — lo más cercano a tus usuarios.
   - **Postgres version:** **16** (la última estable).
   - Click **Create project**.
5. Neon te muestra el **Connection string** del branch `main`. Algo como:
   ```
   postgresql://user:password@ep-xxxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   **Cópialo a un sitio seguro** (password manager). Es CRÍTICO — es el equivalente a `DATABASE_URL`.

### 4.2 Verificar plan

- Neon Free tier: 0.5 GB storage, 7 días retention, 1 project, multiple branches. Suficiente para arrancar.
- Cuando crezcamos (probablemente al pasar de ~100 usuarios activos), upgrade a **Pro $19/mes** para 10 GB, soporte, no auto-suspend. Por ahora **Free está bien**.

### 4.3 Crear branch staging

Para testear migrations antes de tocar prod.

1. Dashboard del project Matripuntos → sidebar **Branches** → **Create branch**.
2. **Branch name:** `staging`.
3. **Parent branch:** `main`.
4. Click **Create branch**.
5. Neon te da el connection string del branch staging. Cópialo también (lo usaremos en Fase 0b para test migrations).

### 4.4 (CUANDO LLEGUEMOS A FASE 0B) Restore datos

Esto se hace en la ventana de switchover. Yo te guío en ese momento — esencialmente:
- pg_dump de Supabase
- pg_restore a Neon main branch
- Verificación row counts

---

## 5. Backblaze B2 (OPCIONAL — backups offsite)

Si quieres seguridad extra de backups (recomendado pero opcional, ya Neon hace 7 días retention):

### 5.1 Crear cuenta

1. **https://www.backblaze.com/cloud-storage/b2/sign-up**.
2. Email + password.
3. Confirma email.
4. NO hace falta tarjeta hasta que pases del free tier (10 GB gratis primero, luego $0.006/GB/mes).

### 5.2 Crear bucket

1. B2 Dashboard → **Buckets** → **Create a Bucket**.
2. **Bucket name:** `matripuntos-db-backups` (debe ser único globalmente, si está cogido prueba `matripuntos-db-backups-<año>`).
3. **Files in Bucket:** **Private**.
4. **Default Encryption:** Enable.
5. **Object Lock:** Disable (a menos que quieras compliance específico).
6. Click **Create a Bucket**.

### 5.3 Crear Application Key

1. B2 Dashboard → **Application Keys** → **Add a New Application Key**.
2. **Name of Key:** `matripuntos-backup-writer`.
3. **Allow access to Bucket(s):** selecciona `matripuntos-db-backups`.
4. **Type of Access:** **Read and Write**.
5. Marca **Allow List All Bucket Names**.
6. Click **Create New Key**.
7. **GUARDA INMEDIATAMENTE** los dos valores que B2 muestra (keyID y applicationKey) — NO se vuelven a mostrar. Ponlos en tu password manager.

---

## Credenciales que necesitaré

Cuando vayamos a ejecutar cada fase, pásame lo siguiente. **NO me las pegues en el chat directamente** — mejor:
- Las metes tú mismo en los dashboards (CF Pages env vars, Railway env vars), o
- Las dejas en un archivo `.env.production.local` que NO se commitea, o
- Me las pasas y yo las uso solo para esa sesión.

| Fase | Credencial | Dónde la necesito | Cómo se obtiene |
|---|---|---|---|
| 0a | URL `*.pages.dev` de CF Pages | Para PR y docs | CF Pages dashboard tras primer deploy |
| 0a | (nada más, billing solo) | | |
| 0b | Railway URL temporal | Para configurar `api.matripuntos.com` | Railway dashboard tras crear service |
| 0b | Neon connection string `main` | Como `DATABASE_URL` en Railway | Neon dashboard → Connection details |
| 0b | Neon connection string `staging` | Para test migrations | Neon → branch staging → Connection |
| 0b (opcional) | B2 keyID + applicationKey | Para `dump-to-b2.sh` script | B2 Application Keys |

---

## Resumen orden de ejecución cuando quieras empezar

1. **Hoy/Mañana — pre-trabajo (~30 min totales tuyos):**
   - Crear cuenta Cloudflare + 2FA.
   - Reducir TTL DNS en keepitup.io a 300s (paso 1.5 del plan v3.0, antes del switchover).
   - Pasarme la confirmación de que está hecho.

2. **Sesión 1 — Fase 0a (yo dirigiendo, ~3h):**
   - Tú haces los clicks en CF dashboard (1.2 → 1.5 de esta guía) siguiendo mis instrucciones en tiempo real.
   - Yo hago los commits, deshabilito FTP workflows, tagueo v3.0.
   - Confirmas Render Starter upgrade (sección 2 de esta guía).

3. **Sesión 2-N — Fase 1 (subagentes en paralelo, ~1 semana):**
   - Yo despacho 5 subagentes mobile-dev en paralelo + 1 consolidador.
   - Tú revisas PRs cuando te aviso.

4. **Sesión M — Fase 2 (PWA shell, ~3-4 días):**
   - Yo + 1 subagente único secuencial.

5. **Sesión X — pre-Fase 0b:**
   - Tú creas cuentas Railway y Neon (secciones 3 y 4 de esta guía).
   - Me pasas connection strings.

6. **Sesión X+1 — Fase 0b (yo dirigiendo, 30 min ventana mantenimiento):**
   - Coordinada conmigo en tiempo real.

7. **Sesión X+2..N — Fase 3 (polish, subagentes paralelos, ~5 días).**

---

## Si algo se atasca

- **Cloudflare no detecta cambio de nameservers tras 24h:** vuelve al panel keepitup, verifica que los nameservers están guardados. A veces hay que hacer logout/login en keepitup. Si persiste, contacta keepitup support.
- **CF Pages build falla:** revisa el log en dashboard. Lo más común es env var faltante o NODE_VERSION distinto. Pásame el log y lo arreglamos.
- **Render Starter sigue durmiéndose:** verifica en Render dashboard → Settings → Plan que dice "Starter", no "Free". Si dice Starter pero duerme, abre ticket Render support.
- **Railway service no arranca:** falta env var. Compara la lista de env vars de Railway con las de Render. Probable: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
- **Neon restore falla:** dump tipo (Fc) y restore deben coincidir. Si dump fue plain SQL, usar psql. Si fue custom (-Fc), usar pg_restore.

---

**Estado de esta guía:** completa para todas las fases del spec mobile-pwa-strategy. Actualizar si Cloudflare/Railway/Neon cambian UIs significativamente.
