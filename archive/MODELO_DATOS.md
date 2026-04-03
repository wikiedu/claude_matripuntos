# Modelo de Datos - Matripuntos

## Base de Datos: PostgreSQL + Supabase (recomendado)

---

## Tablas Principales

### 1. `couples`
Representa una pareja registrada en la app.

```sql
CREATE TABLE couples (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_key      VARCHAR(32) UNIQUE NOT NULL,  -- Para invitaciones
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now(),

  -- Configuración
  num_children    INTEGER DEFAULT 0,            -- 0, 1, 2, 3+
  language        VARCHAR(5) DEFAULT 'es',      -- es, en

  -- Preferencias
  notifications_enabled BOOLEAN DEFAULT true,

  CONSTRAINT valid_children CHECK (num_children >= 0 AND num_children <= 5)
);

-- Índices
CREATE INDEX idx_couples_secret_key ON couples(secret_key);
```

---

### 2. `users`
Usuarios individuales (miembros de pareja).

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,

  -- Auth
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  email_verified  BOOLEAN DEFAULT false,
  verified_at     TIMESTAMP,

  -- Profile
  name            VARCHAR(255) NOT NULL,
  role            VARCHAR(20) DEFAULT 'user',  -- user, admin

  -- Tracking
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now(),
  last_login      TIMESTAMP,

  -- Preferencias personales
  timezone        VARCHAR(50) DEFAULT 'Europe/Madrid',
  notifications_push BOOLEAN DEFAULT true,
  notifications_email BOOLEAN DEFAULT true
);

-- Índices
CREATE INDEX idx_users_couple_id ON users(couple_id);
CREATE INDEX idx_users_email ON users(email);
```

---

### 3. `events` (Actividades Puntuales)
Solicitudes de ausencia/actividad.

```sql
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Evento
  type            VARCHAR(50) NOT NULL,  -- cena, viaje, despedida, etc.
  title           VARCHAR(255),          -- Descripción corta
  description     TEXT,                  -- Justificación

  -- Tiempo
  date_start      TIMESTAMP NOT NULL,
  date_end        TIMESTAMP NOT NULL,

  -- Contexto
  has_children    BOOLEAN DEFAULT false,
  num_children    INTEGER DEFAULT 0,     -- Redundante, pero útil

  -- Puntos
  points_base     DECIMAL(5,2) NOT NULL,     -- Sin multiplicadores
  points_calculated DECIMAL(5,2) NOT NULL,   -- Con multiplicadores
  points_agreed   DECIMAL(5,2),              -- Acordados (si negociaron)

  -- Estado
  status          VARCHAR(30) DEFAULT 'draft',  -- draft, pending, accepted, rejected, negotiating

  -- Negociación
  negotiation_round INTEGER DEFAULT 0,
  max_free_rounds INTEGER DEFAULT 2,

  -- Compensación
  compensation    VARCHAR(255),  -- Descripción (cocina, levantarse, etc.)
  compensation_discount DECIMAL(3,2) DEFAULT 1.0,  -- 0.9 = -10%

  -- Auditoría
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_dates CHECK (date_start < date_end),
  CONSTRAINT valid_status CHECK (status IN
    ('draft', 'pending', 'accepted', 'rejected', 'negotiating', 'completed')),
  CONSTRAINT valid_points CHECK (points_base > 0 AND points_calculated > 0)
);

-- Índices
CREATE INDEX idx_events_couple_id ON events(couple_id);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date_start ON events(date_start);
```

---

### 4. `tasks` (Tareas Recurrentes Diarias)
Tareas estándar del día a día.

```sql
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,

  -- Tarea
  name            VARCHAR(100) NOT NULL,  -- "Cocina", "Limpieza", etc.
  description     VARCHAR(255),
  category        VARCHAR(50) NOT NULL,   -- cocina, limpieza, baños, compra, logística, cuidado

  -- Puntos
  points_base     DECIMAL(5,2) NOT NULL DEFAULT 1.0,

  -- Configuración
  is_default      BOOLEAN DEFAULT false,  -- Si es estándar del sistema

  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);

-- Índices
CREATE INDEX idx_tasks_couple_id ON tasks(couple_id);
CREATE INDEX idx_tasks_category ON tasks(category);
```

---

### 5. `task_logs` (Registro de Tareas Completadas)
Histórico de tareas completadas diariamente.

```sql
CREATE TABLE task_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Fecha
  date            DATE NOT NULL,  -- Fecha cuando se completó

  -- Puntos
  points_base     DECIMAL(5,2) NOT NULL,
  modifier        VARCHAR(50),  -- normal, profunda, visita, etc.
  modifier_value  DECIMAL(3,2) DEFAULT 0,  -- Aditivo al base
  points_final    DECIMAL(5,2) GENERATED ALWAYS AS
                  (points_base + modifier_value) STORED,

  -- Verificación
  status          VARCHAR(30) DEFAULT 'pending',  -- pending, verified, disputed, auto_accepted
  verified_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at     TIMESTAMP,

  -- Disputa
  dispute_reason  TEXT,
  disputed_at     TIMESTAMP,
  points_disputed DECIMAL(5,2),  -- Puntos propuestos en disputa

  -- Auditoría
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now(),

  CONSTRAINT unique_daily_task
    UNIQUE (couple_id, task_id, date, completed_by),
  CONSTRAINT valid_status CHECK (status IN
    ('pending', 'verified', 'disputed', 'auto_accepted')),
  CONSTRAINT valid_points CHECK (points_final > 0)
);

-- Índices
CREATE INDEX idx_task_logs_couple_id ON task_logs(couple_id);
CREATE INDEX idx_task_logs_completed_by ON task_logs(completed_by);
CREATE INDEX idx_task_logs_date ON task_logs(date);
CREATE INDEX idx_task_logs_status ON task_logs(status);
```

---

### 6. `negotiations` (Historial de Negociaciones)
Registro de cada propuesta en negociación de actividades.

```sql
CREATE TABLE negotiations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Ronda
  round_number    INTEGER NOT NULL,  -- 1, 2, 3, 4+

  -- Propuesta
  proposed_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  points_proposed DECIMAL(5,2) NOT NULL,
  message         TEXT,  -- Comentario/justificación

  -- Respuesta
  response_type   VARCHAR(30),  -- accepted, rejected, counter_proposed, awaiting
  responded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_at    TIMESTAMP,

  -- Auditoría
  created_at      TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_round CHECK (round_number > 0),
  CONSTRAINT valid_response CHECK (response_type IN
    ('accepted', 'rejected', 'counter_proposed', 'awaiting', 'forced'))
);

-- Índices
CREATE INDEX idx_negotiations_event_id ON negotiations(event_id);
CREATE INDEX idx_negotiations_proposed_by ON negotiations(proposed_by);
CREATE INDEX idx_negotiations_round ON negotiations(round_number);
```

---

### 7. `points_transactions` (Transacciones de Puntos)
Ledger de todos los cambios de saldo.

```sql
CREATE TABLE points_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Tipos de transacción
  type            VARCHAR(50) NOT NULL,  -- event_accepted, task_completed, donation, forced_payment, etc.
  related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  related_task_log_id UUID REFERENCES task_logs(id) ON DELETE SET NULL,

  -- Monto
  amount          DECIMAL(6,2) NOT NULL,  -- Positivo o negativo

  -- Descripción
  description     VARCHAR(255),

  -- Auditoría
  created_at      TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_amount CHECK (amount != 0)
);

-- Índices
CREATE INDEX idx_points_transactions_couple_id ON points_transactions(couple_id);
CREATE INDEX idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX idx_points_transactions_type ON points_transactions(type);
CREATE INDEX idx_points_transactions_date ON points_transactions(created_at);
```

---

### 8. `compensations` (Compensaciones)
Registro de compensaciones en actividades.

```sql
CREATE TABLE compensations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  couple_id       UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,

  -- Compensación
  type            VARCHAR(50) NOT NULL,  -- cocina, canguro, levantarse, tarea_futura, etc.
  description     VARCHAR(255),

  -- Puntos
  discount_amount DECIMAL(5,2) NOT NULL,  -- Valor del descuento (absoluto)
  discount_percent DECIMAL(3,2),  -- O porcentaje (-10% = 0.10)

  -- Estado
  status          VARCHAR(30) DEFAULT 'pending',  -- pending, completed, expired, cancelled

  -- Compensación Futura (si es tarea futura)
  linked_task_id  UUID REFERENCES tasks(id) ON DELETE SET NULL,
  due_date        DATE,  -- Si es futura
  completed_at    TIMESTAMP,

  -- Auditoría
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN
    ('pending', 'completed', 'expired', 'cancelled'))
);

-- Índices
CREATE INDEX idx_compensations_event_id ON compensations(event_id);
CREATE INDEX idx_compensations_status ON compensations(status);
```

---

### 9. `configurations` (Configuración por Pareja)
Tabla para almacenar multiplicadores, valores base, etc.

```sql
CREATE TABLE configurations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID NOT NULL UNIQUE REFERENCES couples(id) ON DELETE CASCADE,

  -- Tareas Base (JSON para flexibilidad)
  tasks_config    JSONB DEFAULT '{}',
  -- Ejemplo:
  -- {
  --   "cocina": {"base": 2.0, "label": "Cocina"},
  --   "limpieza": {"base": 1.5, "label": "Limpieza"},
  --   ...
  -- }

  -- Multiplicadores
  multipliers_config JSONB DEFAULT '{}',
  -- Ejemplo:
  -- {
  --   "children": [1.0, 1.4, 1.8, 2.2],
  --   "time_slots": [
  --     {"start": "07:00", "end": "09:30", "mult": 1.4, "label": "Mañana"},
  --     ...
  --   ],
  --   ...
  -- }

  -- Tipos de Actividad
  activity_types  JSONB DEFAULT '{}',
  -- Ejemplo:
  -- {
  --   "necesaria": -0.30,
  --   "salud": -0.15,
  --   "ocio": 0.0,
  --   ...
  -- }

  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);

-- Índices
CREATE INDEX idx_configurations_couple_id ON configurations(couple_id);
```

---

### 10. `notifications` (Sistema de Notificaciones)
Bandeja de notificaciones in-app.

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contenido
  type            VARCHAR(50) NOT NULL,  -- event_solicited, event_responded, task_disputed, etc.
  title           VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,

  -- Contexto
  related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  related_task_log_id UUID REFERENCES task_logs(id) ON DELETE SET NULL,

  -- Estado
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMP,

  -- Auditoría
  created_at      TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_type CHECK (type IN
    ('event_solicited', 'event_responded', 'event_forced', 'task_disputed',
     'task_verified', 'negotiation_response', 'compensation_expired', 'balance_alert'))
);

-- Índices
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

### 11. `subscriptions` (Plan Premium)
Suscripciones a premium features.

```sql
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID NOT NULL UNIQUE REFERENCES couples(id) ON DELETE CASCADE,

  -- Plan
  plan            VARCHAR(50) DEFAULT 'free',  -- free, premium, pro

  -- Período
  started_at      TIMESTAMP NOT NULL,
  ends_at         TIMESTAMP,

  -- Pago
  stripe_id       VARCHAR(255),

  -- Auditoría
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);

-- Índices
CREATE INDEX idx_subscriptions_couple_id ON subscriptions(couple_id);
CREATE INDEX idx_subscriptions_ends_at ON subscriptions(ends_at);
```

---

## Vistas Útiles

### Vista: Saldo Actual por Usuario
```sql
CREATE VIEW user_balance AS
SELECT
  u.id,
  u.couple_id,
  u.name,
  COALESCE(SUM(pt.amount), 0) AS balance
FROM users u
LEFT JOIN points_transactions pt ON u.id = pt.user_id
GROUP BY u.id, u.couple_id, u.name;
```

### Vista: Últimos 30 Días de Transacciones
```sql
CREATE VIEW recent_transactions AS
SELECT
  pt.*,
  u.name as user_name,
  c.secret_key as couple_secret
FROM points_transactions pt
LEFT JOIN users u ON pt.user_id = u.id
LEFT JOIN couples c ON pt.couple_id = c.id
WHERE pt.created_at >= NOW() - INTERVAL '30 days'
ORDER BY pt.created_at DESC;
```

---

## Relaciones Principales

```
couples
  ├── users (1:many)
  ├── events (1:many)
  ├── tasks (1:many)
  ├── task_logs (1:many)
  ├── points_transactions (1:many)
  ├── compensations (1:many)
  ├── configurations (1:1)
  ├── notifications (1:many)
  └── subscriptions (1:1)

events
  ├── negotiations (1:many)
  └── compensations (1:many)

tasks
  └── task_logs (1:many)

users
  ├── events (created_by)
  ├── task_logs (completed_by)
  ├── negotiations (proposed_by, responded_by)
  └── notifications (1:many)
```

---

## Consideraciones de Seguridad

1. **Auth**: JWT tokens con refresh
2. **Validación**: Zod en backend, nunca confiar en cliente
3. **Auditoría**: Todas las transacciones logged en points_transactions
4. **Privacidad**: Couples solo ven datos de su pareja
5. **RLS (Row Level Security)**: Si usas Supabase, RLS activo
6. **Timestamps**: Para dispute resolution y auditoría

---

## Migración Inicial (Supabase SQL)

Usar este documento para:
- `npx supabase migration new init_schema`
- Copiar SQL en migration
- `supabase migration up`
