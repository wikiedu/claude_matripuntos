# Sistema de Puntos — Matripuntos

## Tareas Recurrentes (Diarias) — Base Fija

| Tarea | Pts base | Modificadores |
|-------|----------|---------------|
| Cocina (desayuno/comida/cena) | 2.0 | +0.5 visita 5+ · +0.25 dietas especiales |
| Baños + poner a dormir niños | 1.5 | +0.5 con 3+ niños o enfermo · +1.0 rabieta (necesita validación) |
| Limpieza/orden diaria | 1.5 | +1.0 limpieza profunda · +1.5 post-fiesta |
| Compra/gestiones | 1.0 | — |
| Logística escolar/deberes | 1.0 | — |
| Cuidado directo (juego, actividades) | 1.5 | +0.5 actividad programada fuera |
| **Total si una persona hace todo** | **8.5** | — |

---

## Categorías de Evento — Puntos Base (Lote 4)

Al crear un evento, estos son los puntos base según categoría:

| Categoría | Pts base |
|-----------|---------:|
| 🍽️ Gastronomía | 10 |
| ✈️ Escapadas & Viajes | 18 |
| 🎭 Ocio & Cultura | 7 |
| 🏋️ Deporte & Bienestar | 6 |
| 👨‍👩‍👧 Familia & Social | 8 |
| 🏢 Trabajo & Obligaciones | 7 |
| 🎮 Ocio Personal | 6 |

## Actividades Puntuales — Ejemplos (con multiplicadores aplicados)

| Tipo | Duración | 0 hijos | 1 hijo | 2 hijos | 3+ hijos |
|------|----------|---------|--------|---------|----------|
| Cena + copas noche | 4h | 11 | 15 | 20 | 24 |
| Desayuno/brunch | 2-3h | 6 | 8 | 11 | 13 |
| Fin de semana escapada | 24-36h | 19 | 27 | 34 | 42 |
| Despedida soltero (alto impacto) | 12-24h | 12 | 17 | 22 | 27 |
| Boda (alto impacto) | 10h | 21 | 29 | 38 | 46 |
| Maratón/evento deportivo | 4-8h | 6 | 8 | 11 | 13 |
| Viaje de trabajo (necesaria) | 24-48h | 13 | 18 | 23 | 28 |
| Deporte/yoga/gym | 1-2h | 5 | 7 | 9 | 11 |
| Cita médica/trámite | 1-3h | 5 | 7 | 9 | 11 |

---

## Multiplicadores

### Factor Tipo de Actividad
| Tipo | Multiplicador |
|------|--------------|
| Necesaria (médico, trabajo, trámite) | ×0.7 |
| Salud (deporte, yoga, bienestar) | ×0.85 |
| Ocio social (cena, fiesta, casual) | ×1.0 |
| Alto impacto (boda, despedida, viaje con resaca) | ×1.4 |

### Factor Franja Horaria
| Franja | Multiplicador |
|--------|--------------|
| 07:00 – 09:30 (mañana rutina) | ×1.3 |
| 09:30 – 17:30 (día normal) | ×1.0 |
| 17:30 – 21:30 (tarde/cenas) | ×1.2 |
| 21:30 – 01:00 (noche) | ×1.2 |
| 01:00 – 07:00 (madrugada) | ×1.5 |

### Factor Duración
| Duración | Multiplicador |
|----------|--------------|
| 0 – 3 horas | ×1.0 |
| 3 – 8 horas | ×1.1 |
| 8 – 24 horas | ×1.25 |
| 24+ horas | ×1.35 |

### Factor Hijos (en el momento de la ausencia)
| Hijos | Multiplicador |
|-------|--------------|
| 0 | ×1.0 |
| 1 | ×1.4 |
| 2 | ×1.8 |
| 3+ | ×2.2 |

---

## Fórmula

```
Puntos = PuntosBase × FactorTipo × FactorFranja × FactorDuración × FactorHijos
```

Redondeo: al **0.5 más próximo**.

### Ejemplos

**Cena + copas viernes noche (Gastronomía 10, 4h, 0 hijos):**
```
10 × 1.0 × 1.2 × 1.1 × 1.0 = 13.2 → 13 pts
```

**Despedida soltero 24h (Ocio Personal 6, 2 hijos, alto impacto):**
```
6 × 1.4 × 1.2 × 1.35 × 1.8 = 24.5 → 24.5 pts
```

**Boda sábado 10h (Familia & Social 8, 2 hijos, alto impacto):**
```
8 × 1.4 × 1.2 × 1.25 × 1.8 = 30.2 → 30 pts
```

**Médico rutina (Trabajo 7, 1h, día normal, 1 hijo, necesaria):**
```
7 × 0.7 × 1.0 × 1.0 × 1.4 = 6.8 → 7 pts
```

---

## Compensaciones

Reducen los puntos del evento antes de la negociación.

| Tipo | Efecto típico |
|------|--------------|
| Cocina especial | -10 a -20% |
| Contratar canguro | -15 a -25% |
| Levantarse mañana siguiente | -15 a -20% |
| Tarea futura vinculada | -pts fijos |

Se almacena en `Compensation.discountAmount` (fijo) o `discountPercent` (%). Estado: `pending → completed`.
