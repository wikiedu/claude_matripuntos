# Plan de Monetización - Matripuntos

## Modelo: Freemium

Core gratis, features premium pagos.

---

## Plan GRATIS (Unlimited)

### Features Incluidas
- ✓ Registrar actividades puntuales (ilimitadas)
- ✓ Registrar tareas diarias (ilimitadas)
- ✓ 2 rondas de negociación GRATIS por actividad
- ✓ Bandeja de solicitudes
- ✓ Historial básico (últimos 30 días)
- ✓ Configuración de tabla base (editable)
- ✓ Saldo en tiempo real
- ✓ Notificaciones in-app (máx 1-2/día)
- ✓ Auto-aceptación de tareas después de 24h
- ✓ Donaciones (hasta 30 pts/mes)
- ✓ Compensaciones (cocina, levantarse, etc.)

### Limitaciones
- ✗ Máx 2 rondas de negociación (pagar por más)
- ✗ Sin analíticas avanzadas (gráficos de 30 días, tendencias)
- ✗ Sin integraciones (Google Calendar, Slack)
- ✗ Sin backup automático
- ✗ Sin soporte por email
- ✗ Límite futuro: máximo 2 parejas invitadas

### Monetización: Rondas de Negociación Extra
```
Rondas 1-2:  GRATIS

Ronda 3:     €0.99 (one-time por negociación)
             o €2.99/mes (desbloquea todas las rondas ese mes)

Ronda 4+:    €0.99 por ronda (one-time)
```

---

## Plan PREMIUM (€2.99/mes)

### Features Incluidas
- ✓ TODO lo del plan GRATIS
- ✓ Rondas de negociación ILIMITADAS (no hay límite)
- ✓ Historial completo (sin límite de fechas)
- ✓ Analíticas avanzadas:
  - Gráficos detallados (últimos 90 días)
  - Tendencias y predicciones
  - Equidad score (0-100%)
  - Reportes mensuales
- ✓ Integración Google Calendar (lectura de eventos)
- ✓ Notificaciones push + email
- ✓ Backup automático semanal
- ✓ Export de datos (CSV, PDF)
- ✓ Soporte por email (respuesta en 24h)
- ✓ Badge "Premium" en perfil
- ✓ Límite aumentado: máximo 5 parejas invitadas

### Casos de Uso
- Parejas que negocian mucho
- Parejas que quieren track largo plazo
- Parejas que necesitan integraciones

### Duración: Suscripción
- Renovación automática cada mes
- Cancelable en cualquier momento (sin compromiso)
- Primer mes: prueba gratis (primeros 7 días)

---

## Plan PRO (€5.99/mes) - Future

### Features Adicionales (Beyond Premium)
- ✓ TODO lo del plan PREMIUM
- ✓ Integración Slack (notificaciones en canal pareja)
- ✓ Integración Apple Calendar / Outlook
- ✓ Compartir invitaciones con amigos (crear grupos)
- ✓ Comparativa con otras parejas (anónimo)
- ✓ AI coaching ("Tu equidad ha mejorado 15%")
- ✓ Gestor de compensaciones automático
- ✓ Soporte prioritario (chat en vivo)
- ✓ Custom branding (pareja peut renombrer app con su logo)

---

## Opciones de Compra Adicionales (A la Carte)

### 1. "Rondas Ilimitadas" (Mensual)
```
€0.99/mes (acceso durante ese mes)
o €0.99 one-time por ronda extra

Desbloquea:
- Rondas 3, 4, 5, ... sin límite
- Válido solo para esa negociación
```

### 2. "Backup Inmediato" (One-Time)
```
€0.99 one-time

Genera:
- Descarga de todos los datos (CSV + JSON)
- PDF con historial completo
```

### 3. "Reporte Personalizado" (One-Time)
```
€2.99 one-time

Genera:
- Reporte PDF de 30 días
- Análisis equidad detallado
- Gráficos avanzados
- Sugerencias de mejora
```

---

## Política de Precios

### Currency
- EUR (€) por defecto
- USD ($) y GBP (£) en futuro

### Tax
- IVA incluido en precio (EU)
- Impuestos según localización

### Billing
- Monthly (recurrente)
- Annual (descuento 20% si aplica)

### Payment Methods
- Stripe (tarjeta de crédito)
- Apple Pay / Google Pay
- PayPal (futuro)

---

## Estrategia de Conversión

### Funnel
```
Signup → Free trial (7 días)
       ↓
Usar free plan (sin presión)
       ↓
Hit limit (negociación 3ª ronda)
       ↓
Popup: "Quieres ronda extra?"
       ├─ €0.99 (just this time)
       ├─ €2.99/mes (better value)
       └─ Seguir gratis (después pueden volver a pagar)
```

### A/B Testing (Roadmap)
- Test diferentes pricing
- Test diferentes mensajes (urgencia vs beneficio)
- Test free tier limits (cuáles convertir mejor)

---

## Retention Metrics

- DAU (Daily Active Users)
- Negociaciones por pareja/mes
- Churn rate (cancelaciones)
- LTV (lifetime value)
- CAC (customer acquisition cost)

---

## Roadmap de Monetización

### Mes 1-2 (MVP)
- Plan GRATIS con límite de rondas
- Popup "Upgrade" cuando llegan al límite
- Stripe integrado

### Mes 3-4
- Plan PREMIUM (€2.99/mes)
- Analytics avanzadas
- Google Calendar beta

### Mes 6+
- Plan PRO (€5.99/mes)
- Integraciones avanzadas
- Community features

---

## Financial Projections (Estimado)

### Supuestos
- 1,000 parejas registradas en año 1
- 5% conversion a PREMIUM
- 2% conversion a PRO
- 30% churn anual en premium

### Ingresos (Anuales, Año 1)
```
Plan GRATIS:
- 950 parejas × €0 = €0

Plan PREMIUM:
- 50 parejas × €2.99/mes × 12 meses = €1,794

Plan PRO:
- 10 parejas × €5.99/mes × 12 meses = €719

Rondas extra (a la carte):
- 200 rondas × €0.99 = €198

TOTAL AÑO 1: ~€2,700
```

### Costos (Anuales, Año 1)
```
Infraestructura (Vercel + DB): ~€200/mes = €2,400
Stripe fees (2.9% + €0.30): ~€120 (asumiendo €3k ingresos)
Dominio: ~€15
Email (SendGrid): ~€20/mes = €240
Hosting: ~€300

TOTAL: ~€3,000
```

### Resultado: BREAK-EVEN aprox. Año 2

---

## Anti-Churn Strategy

### Engagement
- Email semanal con saldo y actividades
- Milestone celebrations ("¡Lleváis 1 mes jugando!")
- Tips para mejorar equidad

### Retention
- Ofrecer descuento si cancel ("¿Te ayudamos a entender mejor?")
- Free month si 3 meses sin usar
- Referral bonus (si invitas amigos, ambos +10% descuento)

### Win-back
- Campaña email 30 días después de cancelación
- Offer: 1 mes GRATIS si vuelves

---

## Terms & Conditions

### Free Trial (7 días)
```
- Acceso completo a PREMIUM
- Sin tarjeta requerida
- Auto-downgrade a GRATIS si no conviertes
- Notificación 24h antes de downgrade
```

### Suscripción
```
- Renovación automática
- Cancelación instant (sin penalidad)
- Reembolso: hasta 30 días si solicitas
- Cambio de plan: toma efecto inmediatamente
```

### Refund Policy
```
- Dentro de 30 días: reembolso completo
- Después de 30 días: solo crédito aplicable
- Abuso: retención de reembolso
```

---

## Notas Importantes

1. **La app debe ser valiosa SIN pagar**: El gratis debe funcionar muy bien
2. **Premium debe justificar el precio**: Features claros, no artificial limits
3. **No dark patterns**: No ocultar limits, no presionar falsamente
4. **Transparencia**: Siempre mostrar qué incluye cada plan
5. **No pagar para core**: Nunca cobrar por features esenciales (saldo, historial básico)
