// Pestaña "Historial" de la página Tareas (extraída de pages/Tasks.tsx en T2):
// Segment Todas/Mías/Pareja + listado de logs verificados/disputados.

import { History } from 'lucide-react'
import { formatLocalDate } from '../../../utils/dateUtils'
import { Button } from '../primitives/Button'
import { Segment } from './Segment'
import type { TaskLog } from './taskTypes'

export type PersonFilter = 'all' | 'mine' | 'partner'

export function HistoryTab({
  logs, personFilter, onPersonFilterChange,
}: {
  logs: TaskLog[]
  personFilter: PersonFilter
  onPersonFilterChange: (v: PersonFilter) => void
}) {
  return (
    <div className="space-y-2">
      <div className="mb-1">
        <Segment<PersonFilter>
          value={personFilter}
          onChange={onPersonFilterChange}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'mine', label: 'Mías' },
            { value: 'partner', label: 'Pareja' },
          ]}
        />
      </div>
      {logs.length === 0 ? (
        <div className="rounded-md bg-surface-card border border-brd-subtle p-10 text-center">
          <History className="w-10 h-10 mx-auto text-text-tertiary mb-2" />
          <p className="font-semibold text-text-primary">
            {personFilter === 'mine'
              ? 'Sin tareas tuyas todavía'
              : personFilter === 'partner'
                ? 'Sin tareas de tu pareja todavía'
                : 'Sin historial todavía'}
          </p>
          <p className="text-sm text-text-secondary mt-1 max-w-xs mx-auto">
            Las tareas verificadas y disputadas se archivan aquí para revisar puntos, disputas y quién hace qué con el tiempo.
          </p>
          {personFilter !== 'all' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPersonFilterChange('all')}
              className="mt-3"
            >
              Ver todas
            </Button>
          )}
        </div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="p-3 rounded-md bg-surface-card border border-brd-subtle">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      log.status === 'verified'
                        ? 'bg-success/15 text-success border border-success/30'
                        : 'bg-warn/15 text-warn border border-warn/30'
                    }`}
                  >
                    {log.status === 'verified' ? '✅ Verificada' : '⚠️ Disputada'}
                  </span>
                </div>
                <p className="font-medium text-text-primary truncate">{log.taskName}</p>
                <p className="text-[11px] text-text-tertiary">
                  {log.completedBy?.name} · {formatLocalDate(log.date)}
                  {log.verifiedBy && ` · ✓ ${log.verifiedBy.name}`}
                </p>
                {log.disputeReason && (
                  <p className="text-[11px] text-warn mt-0.5">💬 "{log.disputeReason}"</p>
                )}
              </div>
              <div className="ml-3 text-right">
                <div
                  className={`font-bold text-sm tabular-nums ${
                    log.status === 'verified' ? 'text-success' : 'text-text-tertiary'
                  }`}
                >
                  {log.status === 'verified' ? `+${log.pointsFinal}` : log.pointsFinal} pts
                </div>
                <div className="text-[11px] text-text-tertiary">{log.completedBy?.name}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
