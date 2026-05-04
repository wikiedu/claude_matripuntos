// v2.2.1 — Sección "Reglas reales" en Settings.
// Sustituye a la `RulesSection` legacy (DEFAULT_RULES hardcoded). Muestra:
//  - Puntos base por categoría de tarea (Configuration.tasksConfig)
//  - Multiplicadores agrupados (hijos / franja / duración / activityTypes)
//  - Audit log de últimos cambios aplicados (ConfigurationChangeLog)
// Cualquier edición pasa por ProposeChangeDialog → propuesta consensuada que
// SÍ se aplica al backend (v2.2.1: configurationProposalService.accept()
// detecta 'tasks.*' / 'multipliers.*.*' y mutates Configuration).

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader, Pencil, History } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'
import { useChangeLog } from '../../../hooks/useConfigProposals'
import { ProposeChangeDialog } from './ProposeChangeDialog'
import { Card } from '../primitives/Card'

interface ConfigurationData {
  tasksConfig: Record<string, number>
  multipliersConfig: {
    franja?: Record<string, number>
    duracion?: Record<string, number>
    hijos?: Record<string, number>
    activityTypes?: Record<string, number>
  }
}

const TASK_LABELS: Record<string, { label: string; emoji: string }> = {
  cocina:    { label: 'Cocina',    emoji: '🍳' },
  limpieza:  { label: 'Limpieza',  emoji: '🧹' },
  baños:     { label: 'Baños',     emoji: '🚿' },
  compra:    { label: 'Compra',    emoji: '🛒' },
  logistica: { label: 'Logística', emoji: '📋' },
  cuidado:   { label: 'Cuidado',   emoji: '👶' },
}

const FRANJA_LABELS: Record<string, string> = {
  mañana: 'Mañana (07-09:30)',
  normal: 'Día normal',
  tarde: 'Tarde (17:30-21:30)',
  noche: 'Noche (21:30-01:00)',
  madrugada: 'Madrugada (01-07)',
}

const DURACION_LABELS: Record<string, string> = {
  corta: 'Corta (0-3h)',
  media: 'Media (3-8h)',
  larga: 'Larga (8-24h)',
  muyLarga: 'Muy larga (24h+)',
}

const HIJOS_LABELS: Record<string, string> = {
  '0': 'Sin hijos',
  '1': '1 hijo',
  '2': '2 hijos',
  '3': '3+ hijos',
}

interface ProposeTarget {
  field: string
  label: string
  oldValue: string
}

export function RealRulesSection() {
  const { data, isLoading } = useQuery<{ configuration: ConfigurationData }>({
    queryKey: ['configuration'],
    queryFn: () => apiClient.request('/configuration'),
  })
  const changeLog = useChangeLog()
  const [proposeTarget, setProposeTarget] = useState<ProposeTarget | null>(null)

  const config = data?.configuration

  const auditEntries = useMemo(() => {
    return (changeLog.data?.entries ?? []).slice(0, 5)
  }, [changeLog.data])

  if (isLoading || !config) {
    return (
      <div className="flex items-center gap-2 text-text-tertiary text-xs py-4">
        <Loader className="w-4 h-4 animate-spin" /> Cargando reglas…
      </div>
    )
  }

  const renderRuleRow = (
    field: string,
    label: string,
    emoji: string | null,
    value: number,
    suffix: 'pts' | 'x',
  ) => (
    <div
      key={field}
      className="flex items-center gap-2 rounded-md p-2.5 bg-surface-card border border-brd-subtle"
    >
      {emoji && <span className="text-base">{emoji}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate">{label}</p>
      </div>
      <span className="text-sm font-bold tabular-nums text-brand-amber whitespace-nowrap">
        {suffix === 'x' ? '×' : ''}{value}{suffix === 'pts' ? ' pts' : ''}
      </span>
      <button
        type="button"
        aria-label={`Proponer cambio en ${label}`}
        onClick={() => setProposeTarget({ field, label, oldValue: String(value) })}
        className="p-1.5 rounded-md text-text-tertiary hover:text-brand-purple hover:bg-surface-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <Card className="bg-success/10 border-success/30">
        <p className="text-[11px] text-success leading-relaxed">
          ✅ Estas reglas se aplican al cálculo de puntos. Cualquier cambio que propongas requiere que tu pareja lo acepte; al aceptar, se aplica automáticamente desde el siguiente evento o tarea.
        </p>
      </Card>

      {/* Tareas */}
      <section>
        <h3 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2">
          Tareas (suman MP)
        </h3>
        <div className="space-y-1.5">
          {Object.entries(config.tasksConfig).map(([cat, pts]) =>
            renderRuleRow(
              `tasks.${cat}`,
              TASK_LABELS[cat]?.label ?? cat,
              TASK_LABELS[cat]?.emoji ?? '✅',
              pts,
              'pts',
            ),
          )}
        </div>
      </section>

      {/* Multiplicadores · Hijos */}
      {config.multipliersConfig.hijos && (
        <section>
          <h3 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2">
            Factor hijos
          </h3>
          <div className="space-y-1.5">
            {Object.entries(config.multipliersConfig.hijos).map(([k, v]) =>
              renderRuleRow(
                `multipliers.hijos.${k}`,
                HIJOS_LABELS[k] ?? `${k} hijos`,
                '👶',
                Number(v),
                'x',
              ),
            )}
          </div>
        </section>
      )}

      {/* Multiplicadores · Franja */}
      {config.multipliersConfig.franja && (
        <section>
          <h3 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2">
            Factor franja horaria
          </h3>
          <div className="space-y-1.5">
            {Object.entries(config.multipliersConfig.franja).map(([k, v]) =>
              renderRuleRow(
                `multipliers.franja.${k}`,
                FRANJA_LABELS[k] ?? k,
                '🕐',
                Number(v),
                'x',
              ),
            )}
          </div>
        </section>
      )}

      {/* Multiplicadores · Duración */}
      {config.multipliersConfig.duracion && (
        <section>
          <h3 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2">
            Factor duración
          </h3>
          <div className="space-y-1.5">
            {Object.entries(config.multipliersConfig.duracion).map(([k, v]) =>
              renderRuleRow(
                `multipliers.duracion.${k}`,
                DURACION_LABELS[k] ?? k,
                '⏱️',
                Number(v),
                'x',
              ),
            )}
          </div>
        </section>
      )}

      {/* Audit log */}
      {auditEntries.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2 flex items-center gap-1.5">
            <History className="w-3 h-3" /> Cambios recientes
          </h3>
          <div className="space-y-1.5">
            {auditEntries.map((e) => (
              <div
                key={e.id}
                className="rounded-md p-2 bg-surface-card border border-brd-subtle text-[11px]"
              >
                <p className="m-0 text-text-primary font-medium truncate">{e.field}</p>
                <p className="m-0 mt-0.5 text-text-tertiary">
                  <span className="line-through text-text-tertiary/70">{e.oldValue}</span>
                  <span className="mx-1">→</span>
                  <span className="text-brand-amber font-semibold">{e.newValue}</span>
                  <span className="ml-2 text-text-tertiary">
                    · aplicado por {e.appliedBy?.name ?? '...'} ·{' '}
                    {new Date(e.appliedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </p>
              </div>
            ))}
          </div>
          {(changeLog.data?.entries ?? []).length > 5 && (
            <p className="mt-2 text-[10px] text-text-tertiary text-center">
              y {(changeLog.data?.entries ?? []).length - 5} más en el histórico
            </p>
          )}
        </section>
      )}

      {proposeTarget && (
        <ProposeChangeDialog
          field={proposeTarget.field}
          fieldLabel={proposeTarget.label}
          oldValue={proposeTarget.oldValue}
          onClose={() => setProposeTarget(null)}
        />
      )}
    </div>
  )
}

export default RealRulesSection
