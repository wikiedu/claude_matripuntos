# 📚 DICCIONARIO DE TÉRMINOS - MATRIPUNTOS

Glosario de términos técnicos y del negocio usados en el proyecto.

---

## TÉRMINOS DEL NEGOCIO

### Matripunto
**Definición:** Unidad de medida de "deuda de responsabilidad" en una pareja. Representa el valor pactado de una tarea o ausencia.

**Ejemplo:** "Esta cena te cuesta 19.5 matripuntos"

**Abreviatura:** MP

---

### Pareja (Couple)
**Definición:** Relación entre dos usuarios. Pueden ser matrimonio, pareja estable, compañeros, o amigos viviendo juntos.

**En la app:** Todo está asociado a una pareja (eventos, tareas, configuración, saldo).

---

### Solicitud de Actividad (Event)
**Definición:** Propuesta de una ausencia o evento puntual (no recurrente) que requiere negociación de puntos.

**Ejemplos:**
- Cena fuera
- Viaje de trabajo
- Despedida de soltero
- Evento deportivo
- Médico/Urgencia

**Atributos:** Tipo, fecha, hora, duración, descripción, hijos, costo propuesto, status

**Statuses:**
- `pending`: Esperando respuesta del otro usuario
- `accepted`: Ambos acordaron
- `rejected`: Uno rechazó
- `forced`: Se forzó usando matripuntos acumulados

---

### Tarea Recurrente (Task)
**Definición:** Actividad que se repite periódicamente (diaria, semanal, etc.).

**Ejemplos:**
- Cocinar
- Limpiar
- Hacer compras
- Cuidar niños
- Gestiones administrativas

**Atributos:** Nombre, tipo, puntos base, responsable, frecuencia

**Frecuencias:** Diaria, de lunes a viernes, fin de semana, personalizada

---

### Negociación (Negotiation)
**Definición:** Proceso de acordar puntos para una solicitud de actividad.

**Fases:**
1. **Ronda 1 (Inicial):** Uno propone puntos
2. **Ronda 2 (Última gratis):** El otro acepta, rechaza, o contra-propone
3. **Resolución:**
   - Si acuerdan en ronda 2 → fin
   - Si no → mediación, fuerza, o premium

**Máximo rondas gratis:** 2 (sin premium)

---

### Compensación
**Definición:** Descuento aplicado a los puntos por alguna condición mitigadora.

**Tipos:**
- Temporal: "Duermo más mañana" (-10%)
- Tarea: "Cocino especial" (-10%)
- Dinero: "Pago cena fuera" (-15%)
- Favor: "Tú eliges próxima salida" (-10%)
- Justificación: "Urgencia médica" (-20%)

**Máximo descuento:** -30% por evento

---

### Saldo (Balance)
**Definición:** Puntos netos que uno le debe al otro.

**Cálculo:** Suma de todas las transacciones

**Ejemplo:**
- Juan tiene saldo: +15 pts (pareja le debe 15)
- María tiene saldo: -15 pts (ella le debe 15 a Juan)

---

### Equidad (Equity Score)
**Definición:** Métrica que mide qué tan balanceada está la distribución de responsabilidades.

**Rango:** 0-100
- 100: Perfecto balance
- 50-99: Aceptable
- <50: Muy desbalanceado

---

### Premium
**Definición:** Plan de suscripción que desbloquea características avanzadas.

**Costo:** €2.99/mes

**Features:**
- Rondas de negociación ilimitadas
- Analytics completos
- Exportar reportes
- Notificaciones por email
- Integraciones (futuro)

---

## TÉRMINOS TÉCNICOS

### JWT (JSON Web Token)
**Definición:** Token de autenticación sin estado. Se genera en login y se envía en cada request.

**Estructura:** `header.payload.signature`

**Duración:** 7 días en Matripuntos

**Ubicación:** `Authorization: Bearer <token>` header

---

### Endpoint
**Definición:** URL de la API que acepta requests HTTP.

**Ejemplo:** `POST /api/events` (crear evento)

**Tipos:**
- GET: Obtener datos
- POST: Crear datos
- PUT: Actualizar datos
- DELETE: Eliminar datos
- PATCH: Actualización parcial

---

### Request/Response
**Request:** Datos que envía el cliente al servidor (en JSON generalmente)

**Response:** Datos que retorna el servidor (en JSON)

**Ejemplo:**
```json
// REQUEST
POST /api/events
{
  "type": "dinner",
  "startDate": "2026-04-10T21:00:00Z"
}

// RESPONSE
201 Created
{
  "id": "uuid-123",
  "type": "dinner",
  "status": "pending"
}
```

---

### Status Code (Código HTTP)
**200 OK:** Request exitoso

**201 Created:** Recurso creado exitosamente

**400 Bad Request:** Los datos enviados son inválidos

**401 Unauthorized:** Token inválido o expirado

**403 Forbidden:** No tienes permiso

**404 Not Found:** Recurso no existe

**500 Server Error:** Error del servidor

---

### ORM (Object-Relational Mapping)
**Definición:** Librería que mapea tablas de BD a objetos JavaScript.

**En Matripuntos:** Usamos Prisma ORM

**Beneficio:** Evita escribir SQL directamente

---

### Prisma
**Definición:** ORM moderno para TypeScript/Node.js

**Características:**
- Schema declarativo
- Migraciones automáticas
- Type-safe queries
- Studio visual (http://localhost:5555)

---

### SQLite
**Definición:** Base de datos embebida (archivo single file)

**Uso en Matripuntos:** Desarrollo local

**Archivo:** `src/backend/prisma/dev.db`

**Ventajas:**
- Sin servidor externo
- Perfecto para MVP local
- Fácil de resetear

**Desventajas:**
- No escalable
- No apto para producción
- Concurrencia limitada

---

### PostgreSQL
**Definición:** Base de datos relacional profesional

**Uso en Matripuntos:** Producción (via Supabase)

**Ventajas:**
- Altamente escalable
- Soporta concurrencia
- ACID compliant
- Perfecto para SaaS

---

### Supabase
**Definición:** Backend-as-a-Service (BaaS) con PostgreSQL incluido

**Características:**
- PostgreSQL alojada en la nube
- Auth integrada (no la usamos)
- API REST/GraphQL automática (no la usamos)
- Almacenamiento de archivos

**Precio:** Free hasta 500 MB

---

### Zustand
**Definición:** Librería de estado global para React (alternativa a Redux)

**Ventajas:**
- Simple (pocos líneas de código)
- No require boilerplate
- Type-safe con TypeScript
- Devtools disponibles

**En Matripuntos:** Almacena auth, usuario, pareja, UI state

---

### Vite
**Definición:** Build tool moderno para aplicaciones web

**Ventajas:**
- Muy rápido
- HMR (Hot Module Reloading) instantáneo
- Mejor experiencia desarrollo que webpack/Create React App
- Build optimizado para producción

---

### Tailwind CSS
**Definición:** Framework de CSS utility-first

**Concepto:** Clases pequeñas que hacen una cosa (flex, p-4, text-lg)

**Ventajas:**
- Rápido de escribir
- Consistencia visual
- Customizable

**Ejemplo:**
```jsx
<div className="flex gap-4 p-8 bg-blue-500 rounded-lg">
  ...
</div>
```

---

### React Router
**Definición:** Librería para navegación entre páginas en React SPA

**Características:**
- Dynamic routing
- Nested routes
- Lazy loading
- Programmatic navigation

**En Matripuntos:** Rutas /login, /dashboard, /request-activity, /request-inbox

---

### TypeScript
**Definición:** Superset de JavaScript que agrega tipado estático

**Beneficios:**
- Errores detectados en compile-time
- Autocompletar IDE
- Self-documenting code
- Refactoring seguro

**En Matripuntos:** Todo el código es TypeScript

---

### Express.js
**Definición:** Framework minimal para crear APIs HTTP con Node.js

**Características:**
- Routing simple
- Middleware system
- Manejo de errores
- Muy flexible

**En Matripuntos:** Backend REST API

---

### Middleware
**Definición:** Función que procesa un request antes de llegar al endpoint

**Ejemplos en Matripuntos:**
- `authMiddleware`: Verifica JWT
- `corsMiddleware`: Habilita CORS
- `errorMiddleware`: Maneja errores globales

---

### API REST
**Definición:** Arquitectura para APIs basada en HTTP (GET, POST, PUT, DELETE)

**Principios:**
- Resources como URLs: `/api/events`, `/api/users`
- CRUD operations mapeadas a HTTP methods
- Stateless (cada request es independiente)
- Responses en JSON

---

### CORS (Cross-Origin Resource Sharing)
**Definición:** Mecanismo de seguridad que permite o bloquea requests de otros dominios

**Problema:** Frontend (localhost:5173) pide datos a Backend (localhost:3000)

**Solución:** Configurar CORS en backend para permitir frontend

```typescript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))
```

---

### Validación (Zod)
**Definición:** Librería para validar y parsear datos en runtime

**En Matripuntos:** Verifica que los datos del cliente tengan formato correcto

**Ejemplo:**
```typescript
const eventSchema = z.object({
  type: z.enum(['dinner', 'travel', 'sport']),
  startDate: z.string().datetime(),
  description: z.string().min(5).max(200),
})

// Si inválido → error
// Si válido → pasado al handler
```

---

### bcryptjs
**Definición:** Librería para hashear y comparar contraseñas

**Ventajas:**
- Incorpora salt (previene rainbow tables)
- Costo computacional configurable
- Lento a propósito (seguridad)

**En Matripuntos:** Contraseñas hashadas con bcrypt, nunca almacenadas en plano

---

### Environment Variables (.env)
**Definición:** Configuración sensible que no debe commiterse a git

**En Matripuntos:**
- `DATABASE_URL`: Conexión BD
- `JWT_SECRET`: Clave para firmar tokens
- `FRONTEND_URL`: URL del frontend (para CORS)
- `PORT`: Puerto del servidor

---

### Git
**Definición:** Sistema de control de versiones

**Comandos básicos:**
```bash
git clone          # Clonar repo
git add            # Stage cambios
git commit         # Crear commit
git push           # Enviar a servidor
git pull           # Traer cambios
git branch         # Ver/crear ramas
```

---

### Package.json
**Definición:** Archivo de configuración de Node.js project

**Contiene:**
- `dependencies`: Librerías necesarias para producción
- `devDependencies`: Librerías solo para desarrollo
- `scripts`: Comandos (npm run)
- Metadata (nombre, versión, autor)

---

### npm (Node Package Manager)
**Definición:** Gestor de paquetes para JavaScript/Node.js

**Comandos:**
```bash
npm install           # Instalar dependencias
npm install pkg       # Agregar nueva dependencia
npm run build         # Ejecutar script "build"
npm start             # Ejecutar script "start"
```

---

### Build/Compilación
**Definición:** Proceso de convertir código fuente a código ejecutable

**Frontend:** TypeScript + JSX → JavaScript
```bash
npm run build  # src/frontend → dist/
```

**Backend:** TypeScript → JavaScript
```bash
npm run build  # src/backend/src/ → dist/
```

---

### Dev Server
**Definición:** Servidor local para desarrollo con características como HMR

**Frontend (Vite):**
```bash
npm run dev  # Inicia en http://localhost:5173
```

**Backend (Node):**
```bash
npm start    # Inicia en http://localhost:3000
```

---

### Deployment/Despliegue
**Definición:** Publicar la aplicación en producción

**Pasos:**
1. Build (compilar código)
2. Push a repositorio
3. CI/CD detecta y despliega automáticamente
4. App accesible en URL pública

**Servicios usados:**
- **Frontend:** Vercel
- **Backend:** Railway
- **BD:** Supabase

---

### CI/CD (Continuous Integration/Continuous Deployment)
**Definición:** Automatización de testing y despliegue

**Flujo:**
```
Push código → Build → Test → Deploy automático
```

**En Matripuntos:**
- Vercel: Auto-despliega frontend en cada push a main
- Railway: Auto-despliega backend en cada push a main

---

### Logging
**Definición:** Imprimir información para debugging

**Niveles:**
- `log()`: Información general
- `warn()`: Advertencias
- `error()`: Errores
- `debug()`: Información de debugging

**En Matripuntos:** console.log() en backend para ver flujo

---

### Performance
**Definición:** Métrica de velocidad y eficiencia de la app

**Métricas:**
- Tiempo de carga (First Contentful Paint)
- Tiempo de respuesta API (<200ms ideal)
- Tamaño del bundle
- CPU/Memoria usada

---

### Scaling
**Definición:** Aumentar capacidad para manejar más usuarios

**Horizontal:** Más servidores
**Vertical:** Servidores más potentes

**En Matripuntos:** Empezar pequeño, escalar si crece

---

## ABREVIATURAS

| Abreviatura | Significado |
|------------|------------|
| MVP | Minimum Viable Product |
| BD | Base de Datos |
| API | Application Programming Interface |
| HTTP | Hypertext Transfer Protocol |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| ORM | Object-Relational Mapping |
| CRUD | Create, Read, Update, Delete |
| SPA | Single Page Application |
| HMR | Hot Module Replacement |
| CI/CD | Continuous Integration/Deployment |
| CORS | Cross-Origin Resource Sharing |
| UUID | Universally Unique Identifier |
| ISO | International Organization Standardization |
| UTC | Coordinated Universal Time |
| ENV | Environment |
| PT | Matripuntos |
| MP | Matripuntos (abreviado) |

---

## CONCEPTOS RELACIONADOS

### Equidad en Relaciones
El sistema de Matripuntos se basa en la premisa de que las parejas necesitan:
1. **Transparencia:** Saber quién hace qué
2. **Equidad:** Balance en responsabilidades
3. **Comunicación:** Negociar claramente
4. **Registro:** Historial para resolver discusiones

---

### Gamificación
Usar puntos (no dinero real) tiene psicología positiva:
- No es "pago por favores"
- Es un juego cooperativo
- Incentiva comunicación
- Mantiene relación ligera

---

### Escalabilidad
Matripuntos está diseñado para crecer:
- **MVP (ahora):** Pareja + 2 usuarios
- **V1:** Multi-pareja, anuncios
- **V2:** Grupos (familias), roommates
- **V3:** Empresa (equipos, departamentos)

---

**Fin del Diccionario**

Este documento es una referencia viva. Si encuentras términos no definidos, agrega una entrada.

---
