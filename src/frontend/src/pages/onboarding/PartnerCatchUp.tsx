// v2.2.3 — Onboarding del partner que llega segundo (Claude Design canvas 08).
// Sustituye los pasos clásicos rules+categories por catch-up de 4 pasos:
//   1. Welcome (avatar invitador + Edu, mensaje opcional)
//   2. Catch-up (qué lleva Blanca: nivel, saldo, mood, tareas, reglas)
//   3. First task (grid 6 tareas comunes para empezar)
//   4. Done (confeti + tip primera semana)
//
// Hereda config — no re-configura nada. Reduce 6 pasos a 4 y aporta
// "no llegas tarde a una fiesta" en lugar de empezar desde cero.

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { apiClient } from '../../services/apiClient'
import { Button } from '../../components/v2/primitives/Button'

interface PartnerSummary {
  partner: {
    id: string
    name: string
    avatarEmoji: string
    avatarColor: string
    currentMood: string | null
    moodUpdatedAt: string | null
  }
  couple: {
    xp: number
    level: string
    dailyStreakDays: number
    createdAt: string
  }
  partnerBalance: number
  tasksThisWeek: number
  customTemplates: number
  topRules: Array<{ key: string; value: number }>
  activeMultipliers: string[]
}

const LEVEL_NAMES: Record<string, string> = {
  encuentro: 'Encuentro', confianza: 'Confianza', compania: 'Compañía',
  complicidad: 'Complicidad', refugio: 'Refugio', raices: 'Raíces',
  tribu: 'Tribu', legado: 'Legado', eterno: 'Eterno', mito: 'Mito',
}

const QUICK_TASKS = [
  { emoji: '🍳', name: 'Cocinar',     category: 'cocina',    points: 2.5 },
  { emoji: '🛒', name: 'Compra',      category: 'compra',    points: 3 },
  { emoji: '🧺', name: 'Lavadora',    category: 'limpieza',  points: 1 },
  { emoji: '🐕', name: 'Sacar perro', category: 'mascotas',  points: 1 },
  { emoji: '🧹', name: 'Limpieza',    category: 'limpieza',  points: 2 },
  { emoji: '➕', name: 'Otra',        category: 'otros',     points: 0 },
]

interface Props {
  onComplete: () => void
}

export function PartnerCatchUp({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [pickedTask, setPickedTask] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, isLoading } = useQuery<{ summary: PartnerSummary | null }>({
    queryKey: ['partner-summary'],
    queryFn: () => apiClient.request('/auth/partner-summary'),
  })

  useEffect(() => {
    // Si data es null el partner no tiene actividad → saltamos a flow normal.
    if (data && data.summary === null) onComplete()
  }, [data, onComplete])

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-text-tertiary text-sm">Cargando…</p>
      </main>
    )
  }

  const summary = data?.summary
  if (!summary) {
    return null  // useEffect ya derivó al flow normal
  }

  const pct = (step / 4) * 100
  const partnerName = summary.partner.name
  const levelName = LEVEL_NAMES[summary.couple.level] ?? summary.couple.level
  const daysActive = Math.max(1, Math.floor(
    (Date.now() - new Date(summary.couple.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  ))

  const handleConfirmTask = async () => {
    if (!pickedTask) {
      setStep(4)
      return
    }
    const task = QUICK_TASKS.find((t) => t.name === pickedTask)
    if (!task || task.points === 0) {
      setStep(4)
      return
    }
    setBusy(true)
    try {
      // Best-effort: creamos la tarea en el catálogo + log inmediato
      const created: any = await apiClient.request('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          name: task.name,
          category: task.category,
          pointsBase: task.points,
          isDefault: false,
        }),
      })
      const taskId = created?.task?.id
      if (taskId) {
        await apiClient.request(`/tasks/${taskId}/log`, {
          method: 'POST',
          body: JSON.stringify({
            date: new Date().toISOString(),
            pointsBase: task.points,
          }),
        }).catch(() => {})
      }
    } catch {
      // No bloqueamos onboarding por esto
    } finally {
      setBusy(false)
      setStep(4)
    }
  }

  return (
    <main className="min-h-screen pb-32">
      {/* Progress */}
      <div className="px-4 pt-8">
        <div className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold">
          Paso {step} de 4
        </div>
        <div className="mt-2 h-1 bg-surface-card rounded-full overflow-hidden">
          <div
            className="h-full bg-grad-cta rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1) as any)}
            className="mt-3 -ml-2 inline-flex items-center gap-1 text-text-tertiary hover:text-text-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded"
            aria-label="Volver al paso anterior"
          >
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
        )}
      </div>

      {step === 1 && (
        <section className="px-4 mt-6">
          <div
            className="rounded-2xl p-7 text-center border"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.20), rgba(245,158,11,0.10))',
              borderColor: 'rgba(168,85,247,0.35)',
            }}
          >
            <div className="flex justify-center -space-x-3 mb-4">
              <div
                className="w-14 h-14 rounded-full inline-flex items-center justify-center text-2xl font-bold border-4 border-surface-base text-white"
                style={{ background: summary.partner.avatarColor }}
              >
                {summary.partner.avatarEmoji}
              </div>
              <div className="w-14 h-14 rounded-full inline-flex items-center justify-center text-2xl border-4 border-surface-base bg-grad-cta text-white font-bold">
                ✨
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-text-primary mb-1">
              {partnerName} te invita a Matripuntos
            </h2>
            <p className="text-sm text-text-secondary">
              Lleva {daysActive} {daysActive === 1 ? 'día' : 'días'} usando la app.
            </p>
          </div>
          <p className="mt-6 text-sm text-text-secondary leading-relaxed">
            Es una app de pareja para repartir tareas y planes con un sistema de puntos.
            <br /><br />
            <strong className="text-text-primary">2 minutos</strong> y estás dentro.
          </p>
          <div className="fixed left-0 right-0 bottom-0 p-4 bg-surface-base/95 backdrop-blur border-t border-brd-subtle">
            <Button size="lg" fullWidth onClick={() => setStep(2)}>
              Empezar
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="px-4 mt-4">
          <h1 className="text-2xl font-extrabold text-text-primary mb-1">
            Esto lleva {partnerName}
          </h1>
          <p className="text-sm text-text-tertiary mb-5 leading-relaxed">
            Sin presión — empezáis a contar puntos cuando tú entres.
          </p>

          <div className="rounded-xl bg-surface-card border border-brd-subtle p-4 mb-3">
            <h3 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2">
              Su estado
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-dashed border-brd-subtle">
                <span className="text-text-secondary">Nivel pareja</span>
                <strong className="text-text-primary tabular-nums">{levelName}</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-dashed border-brd-subtle">
                <span className="text-text-secondary">Su saldo</span>
                <strong className="text-brand-amber tabular-nums">
                  {summary.partnerBalance >= 0 ? '+' : ''}{summary.partnerBalance.toFixed(1)} MP
                </strong>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-dashed border-brd-subtle">
                <span className="text-text-secondary">Tareas esta semana</span>
                <strong className="text-text-primary tabular-nums">
                  {summary.tasksThisWeek}
                </strong>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-text-secondary">Racha pareja</span>
                <strong className="text-text-primary tabular-nums">
                  🔥 {summary.couple.dailyStreakDays} {summary.couple.dailyStreakDays === 1 ? 'día' : 'días'}
                </strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-3.5 mb-4" style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}>
            <p className="text-xs font-bold text-text-primary mb-2">📋 Reglas que ha configurado</p>
            <ul className="text-xs text-text-secondary space-y-1 ml-4 list-disc">
              {summary.topRules.length > 0 && (
                <li>
                  {summary.topRules.map(r => `${r.key} = ${r.value} MP`).join(' · ')}
                </li>
              )}
              {summary.activeMultipliers.length > 0 && (
                <li>{summary.activeMultipliers.join(' · ')}</li>
              )}
              {summary.customTemplates > 0 && (
                <li>{summary.customTemplates} {summary.customTemplates === 1 ? 'plantilla' : 'plantillas'} de actividad</li>
              )}
            </ul>
            <p className="mt-2.5 text-[11px] text-brand-amber font-semibold">
              Podrás cambiar todo desde Ajustes — los cambios pasan por aprobación de {partnerName}.
            </p>
          </div>

          <div className="fixed left-0 right-0 bottom-0 p-4 bg-surface-base/95 backdrop-blur border-t border-brd-subtle">
            <Button size="lg" fullWidth onClick={() => setStep(3)}>
              Entiendo, sigamos →
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="px-4 mt-4">
          <h1 className="text-2xl font-extrabold text-text-primary mb-1">Tu primera tarea</h1>
          <p className="text-sm text-text-tertiary mb-4 leading-relaxed">
            Elige una tarea que sueles hacer hoy. Te da +MP y {partnerName} lo ve en directo.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TASKS.map((t) => {
              const active = pickedTask === t.name
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setPickedTask(t.name === pickedTask ? null : t.name)}
                  className={`p-3.5 rounded-xl text-center transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple ${
                    active
                      ? 'bg-brand-purple/15 border-brand-purple'
                      : 'bg-surface-card border-brd-subtle hover:border-brand-purple/40'
                  }`}
                >
                  <div className="text-2xl">{t.emoji}</div>
                  <div className="mt-1 text-xs font-bold text-text-primary">{t.name}</div>
                  <div className="mt-0.5 text-[10px] font-bold text-brand-amber">
                    {t.points > 0 ? `+${t.points} MP` : '+? MP'}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-[11px] text-text-tertiary text-center">
            O puedes saltar este paso y empezar mañana.
          </p>

          <div className="fixed left-0 right-0 bottom-0 p-4 bg-surface-base/95 backdrop-blur border-t border-brd-subtle">
            <Button size="lg" fullWidth onClick={handleConfirmTask} disabled={busy}>
              {busy ? 'Registrando…' : pickedTask ? `Confirmar "${pickedTask}"` : 'Saltar →'}
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="px-4 mt-4">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-extrabold text-text-primary mb-1">
              ¡Estáis dentro!
            </h1>
            <p className="text-sm text-text-tertiary leading-relaxed">
              {partnerName} verá que te has unido. Empezáis a contar puntos a partir de ahora.
            </p>
          </div>

          <div className="rounded-xl p-3.5 mb-3"
            style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}
          >
            <p className="text-xs font-bold text-brand-purple mb-1.5">💡 Tip · primera semana</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              No intentéis ajustar reglas el primer día — usadlas tal como {partnerName} las dejó.
              A los 7 días tendréis claro cuáles os chirrían.
            </p>
          </div>

          <div className="fixed left-0 right-0 bottom-0 p-4 bg-surface-base/95 backdrop-blur border-t border-brd-subtle">
            <Button size="lg" fullWidth onClick={onComplete}>
              Ir al dashboard →
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}

export default PartnerCatchUp
