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

## Actividades Puntuales — Tabla Base (sin multiplicadores)

| Tipo | Duración | 0 hijos | 1 hijo | 2 hijos | 3+ hijos |
|------|----------|---------|--------|---------|----------|
| Cena + copas | 4-6h | 6-10 | 8-14 | 12-18 | 16-22 |
| Desayuno/brunch | 2-3h | 2-3 | 3-4 | 4-6 | 6-8 |
| Fin de semana | 24-36h | 20-30 | 28-42 | 40-56 | 56-72 |
| Despedida soltero | 12-24h | 15-25 | 20-35 | 30-50 | 42-70 |
| Maratón/evento deportivo | 4-8h | 6-12 | 8-16 | 12-24 | 16-32 |
| Viaje de trabajo | 24-48h+ | 30-50 | 42-70 | 60-100 | 84-140 |
| Deporte/yoga/gym | 1-2h | 2-3 | 3-4 | 4-6 | 6-8 |
| Cita médica/trámite | 1-3h | 1-2 | 2-3 | 3-4 | 4-6 |
| Compra/recados importantes | 2-4h | 2-4 | 3-6 | 4-8 | 6-10 |
| Cena familiar (ambos) | 3-4h | 0 | 0 | 0 | 0 |

---

## Multiplicadores

### Factor Tipo de Actividad
| Tipo | Multiplicador |
|------|--------------|
| Necesaria (médico, trabajo obligatorio) | ×0.7 |
| Salud (deporte, terapia, descanso) | ×0.85 |
| Ocio social (cena, fiesta, casual) | ×1.0 |
| Alto impacto (despedida, viaje con resaca) | ×1.2 |

### Factor Franja Horaria
| Franja | Multiplicador |
|--------|--------------|
| 07:00 – 09:30 (mañana rutina) | ×1.4 |
| 09:30 – 17:30 (día normal) | ×1.0 |
| 17:30 – 21:30 (tarde/cenas) | ×1.5 |
| 21:30 – 01:00 (noche) | ×1.2 |
| 01:00 – 07:00 (madrugada) | ×1.6 |

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

**Cena + copas viernes noche (4h, 0 hijos):**
```
8 × 1.0 × 1.2 × 1.0 × 1.0 = 9.6 → 10 pts
```

**Despedida soltero 24h (2 hijos, franja mixta):**
```
20 × 1.2 × 1.2 × 1.25 × 1.8 = 64.8 → 65 pts
```

**Médico rutina (1h, día normal, 1 hijo):**
```
1 × 0.7 × 1.0 × 1.0 × 1.4 = 0.98 → 1.0 pt
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
