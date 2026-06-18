// v2.0.2.x — Página /journal con UI completa: prompt diario, composer simple
// (texto + tags + shared toggle), feed de entries con reactions, retro modal.

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useJournalEntries, useTodayPrompt, useRetrospectives, type JournalEntry } from '../hooks/useJournal'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { ConfirmDialog } from '../components/v2/primitives/ConfirmDialog'

const TYPE_EMOJI: Record<string, string> = {
  reflection: '💭',
  photo: '📷',
  voice: '🎙️',
  milestone: '⭐',
  letter: '💌',
}

const QUICK_REACTIONS = ['❤️', '🥰', '😂', '🙏', '🔥']

export default function Journal() {
  const { user } = useAppStore()
  const queryClient = useQueryClient()

  const entriesQ = useJournalEntries()
  const promptQ = useTodayPrompt()
  const retrosQ = useRetrospectives()

  const [body, setBody] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [shared, setShared] = useState(false)
  const [type, setType] = useState<'reflection' | 'milestone' | 'letter'>('reflection')
  const [usePrompt, setUsePrompt] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true); setErr(null)
    try {
      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 20)
      await apiClient.request('/journal/entries', {
        method: 'POST',
        body: JSON.stringify({
          type, body: body.trim(), shared, tags,
          promptId: usePrompt && promptQ.data?.prompt ? promptQ.data.prompt.id : null,
        }),
      })
      setBody(''); setTagsRaw(''); setShared(false); setUsePrompt(false)
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
    } catch (e: any) {
      setErr(e?.message ?? 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  async function react(entryId: string, emoji: string) {
    // v2.6.1 audit 05 4.2 — antes el catch era silencioso y el user no
    // sabía que la reacción no se había guardado. Mostramos el error
    // (mismo banner que submit) y preservamos la intención del click.
    try {
      await apiClient.request(`/journal/entries/${entryId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo guardar la reacción')
    }
  }

  // p3 A4-2 — antes las reacciones eran add-only (solo POST /react, idempotente):
  // pulsar el mismo emoji no hacía nada y no se podía deshacer una reacción puesta
  // por error. El backend ya exponía DELETE /react?emoji= pero el front nunca lo
  // llamaba. Ahora EntryCard alterna: si ya reaccioné con ese emoji, lo quita.
  async function unreact(entryId: string, emoji: string) {
    try {
      await apiClient.request(
        `/journal/entries/${entryId}/react?emoji=${encodeURIComponent(emoji)}`,
        { method: 'DELETE' },
      )
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo quitar la reacción')
    }
  }

  // E.7 Fase 2 — responder al prompt ahora también enfoca el composer
  // (antes solo cambiaba el placeholder y el user no veía feedback).
  function answerPrompt() {
    setUsePrompt(true)
    document.querySelector<HTMLTextAreaElement>('[data-testid="journal-body"]')?.focus()
  }

  // E.7 Fase 2 — CTA de retrospectiva: marcarla como vista (antes el endpoint
  // POST /retrospectives/:id/seen existía pero la UI nunca lo llamaba, así que
  // la card quedaba "pendiente" indefinidamente).
  async function markRetroSeen(id: string) {
    try {
      await apiClient.request(`/journal/retrospectives/${id}/seen`, { method: 'POST' })
      queryClient.invalidateQueries({ queryKey: ['journal', 'retrospectives'] })
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo marcar la retrospectiva como vista')
    }
  }

  function deleteEntry(id: string) {
    setConfirmDeleteId(id)
  }

  async function performDelete() {
    if (!confirmDeleteId) return
    try {
      await apiClient.request(`/journal/entries/${confirmDeleteId}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo eliminar la entrada')
    }
    setConfirmDeleteId(null)
  }

  const entries = entriesQ.data?.entries ?? []
  const prompt = promptQ.data?.prompt ?? null
  const unseenRetros = (retrosQ.data?.retrospectives ?? []).filter(r => {
    return !(r.seenByUser1 && r.seenByUser2)
  })

  return (
    <main className="px-4 pt-3 pb-20 max-w-[500px] mx-auto" data-testid="journal-page">
      <header className="mb-4">
        <h1 className="text-xl font-extrabold text-text-primary">📔 Diario</h1>
        <p className="text-xs text-text-secondary mt-0.5">Vuestra bitácora compartida</p>
      </header>

      {/* Prompt diario */}
      {prompt && (
        <section data-testid="journal-prompt" className="rounded-xl bg-purple-900/20 border border-purple-500/20 p-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-300 mb-1">Pregunta de hoy</p>
          <p className="text-sm text-white/90 italic">{prompt.text}</p>
          <button
            type="button"
            onClick={answerPrompt}
            className="text-[11px] text-amber-400 mt-1.5 underline"
          >
            Responder a esta pregunta →
          </button>
        </section>
      )}

      {/* Composer */}
      <section data-testid="journal-composer" className="rounded-xl bg-surface-card border border-brd-subtle p-3 mb-4">
        <form onSubmit={submit} className="flex flex-col gap-2">
          <div className="flex gap-1.5 mb-1">
            {(['reflection', 'milestone', 'letter'] as const).map(t => (
              <button
                key={t}
                type="button"
                data-testid={`journal-type-${t}`}
                onClick={() => setType(t)}
                className={`text-xs px-2 py-1 rounded-md ${type === t ? 'bg-amber-500 text-black font-medium' : 'bg-white/5 text-white/70'}`}
              >
                {TYPE_EMOJI[t]} {t === 'reflection' ? 'Reflexión' : t === 'milestone' ? 'Hito' : 'Carta'}
              </button>
            ))}
          </div>
          {/* E.7 — feedback visible de que la entrada responde al prompt de hoy */}
          {usePrompt && prompt && (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-purple-900/20 border border-purple-500/20">
              <span className="text-[11px] text-purple-300 truncate">
                💬 Respondiendo a la pregunta de hoy
              </span>
              <button
                type="button"
                onClick={() => setUsePrompt(false)}
                className="text-white/40 text-xs hover:text-white/70 flex-shrink-0"
                aria-label="Dejar de responder a la pregunta de hoy"
              >
                ×
              </button>
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={4}
            placeholder={usePrompt ? prompt?.text : '¿Qué quieres recordar hoy?'}
            data-testid="journal-body"
            className="bg-transparent border border-brd-subtle rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500 resize-none"
          />
          <input
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="Tags separados por coma (opcional)"
            data-testid="journal-tags"
            className="bg-transparent border border-brd-subtle rounded-md px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs text-white/80">
              <input
                type="checkbox"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
                data-testid="journal-shared"
                className="accent-amber-500"
              />
              Compartir con pareja
            </label>
            <button
              type="submit"
              disabled={busy || !body.trim()}
              data-testid="journal-submit"
              className="px-3 py-1.5 rounded-md bg-amber-500 text-black text-xs font-medium disabled:opacity-50"
            >
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          {err && <p className="text-[11px] text-danger">{err}</p>}
        </form>
      </section>

      {/* Retrospectivas pendientes */}
      {unseenRetros.length > 0 && (
        <section className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">Retrospectiva</p>
          {unseenRetros.slice(0, 1).map(r => (
            <RetrospectiveCard key={r.id} retro={r} onSeen={() => markRetroSeen(r.id)} />
          ))}
        </section>
      )}

      {/* Feed entries */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">Entradas</p>
        {entries.length === 0 ? (
          /* v2.7.7 audit 09 S2-U-8 — empty state con ilustración + CTA. */
          <div className="text-center py-10 px-4 rounded-xl bg-surface-card border border-brd-subtle border-dashed">
            <div className="text-4xl mb-3" aria-hidden="true">📔</div>
            <p className="text-sm font-semibold text-text-primary mb-1">Aún no hay entradas</p>
            <p className="text-xs text-text-secondary mb-4 max-w-xs mx-auto leading-relaxed">
              Lo que escribáis aquí queda como vuestro diario compartido. Empieza con una reflexión, un hito o una carta.
            </p>
            <button
              type="button"
              onClick={() => {
                document.querySelector<HTMLTextAreaElement>('[data-testid="journal-body"]')?.focus()
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber rounded px-2 py-1"
            >
              ✍️ Escribir la primera entrada
            </button>
          </div>
        ) : (
          entries.map(e => (
            <EntryCard
              key={e.id}
              entry={e}
              isMine={e.authorId === user?.id}
              currentUserId={user?.id}
              onReact={(emoji) => react(e.id, emoji)}
              onUnreact={(emoji) => unreact(e.id, emoji)}
              onDelete={() => deleteEntry(e.id)}
            />
          ))
        )}
      </section>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Borrar entrada"
        message="¿Seguro que quieres borrar esta entrada? Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        variant="danger"
        onConfirm={performDelete}
        onClose={() => setConfirmDeleteId(null)}
      />
    </main>
  )
}

function EntryCard({ entry, isMine, currentUserId, onReact, onUnreact, onDelete }: {
  entry: JournalEntry
  isMine: boolean
  currentUserId?: string
  onReact: (emoji: string) => void
  onUnreact: (emoji: string) => void
  onDelete: () => void
}) {
  // v2.6.1 audit 05 4.3 — `entry.tags` puede ser un JSON malformado (bug
  // histórico v2.0.2) o un string vacío. Parseamos defensivamente y
  // logueamos en consola para diagnostico — el cliente sigue mostrando
  // [] en ese caso para no romper la card.
  const tags = (() => {
    if (!entry.tags) return []
    try {
      const parsed = JSON.parse(entry.tags)
      return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
    } catch (e) {
      console.warn('[Journal] entry.tags malformado, usando []:', entry.id, e)
      return []
    }
  })()
  const reactionCounts = new Map<string, number>()
  const myReactions = new Set<string>()
  for (const r of entry.reactions ?? []) {
    reactionCounts.set(r.emoji, (reactionCounts.get(r.emoji) ?? 0) + 1)
    if (currentUserId && r.userId === currentUserId) myReactions.add(r.emoji)
  }

  return (
    <article data-testid="journal-entry" className="rounded-lg bg-surface-card border border-brd-subtle p-3">
      <header className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true">{TYPE_EMOJI[entry.type] ?? '📝'}</span>
          <span className="text-[10px] text-white/50">
            {new Date(entry.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          {entry.shared && <span className="text-[10px] text-amber-400">· compartido</span>}
        </div>
        {isMine && (
          <button onClick={onDelete} className="text-white/40 text-xs hover:text-danger" aria-label="Eliminar">×</button>
        )}
      </header>
      {entry.body && (
        <p className="text-sm text-white/90 whitespace-pre-wrap leading-snug">{entry.body}</p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map(t => (
            <span key={t} className="text-[10px] bg-white/5 text-white/60 px-1.5 py-0.5 rounded">#{t}</span>
          ))}
        </div>
      )}
      {!isMine && entry.shared && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-brd-subtle">
          {QUICK_REACTIONS.map(emoji => {
            const mine = myReactions.has(emoji)
            return (
              <button
                key={emoji}
                type="button"
                // p3 A4-2 — toggle: si ya reaccioné con este emoji, lo quito.
                onClick={() => (mine ? onUnreact(emoji) : onReact(emoji))}
                aria-pressed={mine}
                className={`text-base hover:scale-110 transition rounded ${mine ? 'scale-110 ring-1 ring-amber-400/60 bg-amber-500/10' : ''}`}
                aria-label={mine ? `Quitar reacción ${emoji}` : `Reaccionar con ${emoji}`}
              >
                {emoji}
              </button>
            )
          })}
        </div>
      )}
      {reactionCounts.size > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {[...reactionCounts.entries()].map(([emoji, count]) => {
            const mine = myReactions.has(emoji)
            return (
              <button
                key={emoji}
                type="button"
                // p3 A4-2 — la pill de mi propia reacción ahora la puedo retirar
                // pulsándola; las de la pareja no son interactivas.
                onClick={mine ? () => onUnreact(emoji) : undefined}
                disabled={!mine}
                aria-label={mine ? `Quitar tu reacción ${emoji}` : `${emoji} ${count}`}
                className={`text-[11px] px-1.5 py-0.5 rounded-full ${mine ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40 hover:bg-amber-500/30' : 'bg-white/10 text-white/80 cursor-default'}`}
              >
                {emoji} {count}
              </button>
            )
          })}
        </div>
      )}
    </article>
  )
}

function RetrospectiveCard({ retro, onSeen }: { retro: any; onSeen: () => void }) {
  const data = retro.data ?? {}
  const stats = data.stats ?? {}
  const periodLabel = retro.period === 'week' ? 'semana' : retro.period === 'month' ? 'mes' : 'año'

  return (
    <div data-testid="journal-retrospective" className="rounded-xl bg-gradient-to-br from-amber-600/20 to-pink-600/20 border border-amber-500/30 p-3">
      <p className="text-xs font-semibold text-amber-300 mb-1">Esta {periodLabel} en vuestra pareja</p>
      <ul className="text-xs text-white/85 space-y-0.5">
        {stats.eventsAccepted > 0 && <li>• {stats.eventsAccepted} actividades aceptadas</li>}
        {stats.tasksVerified > 0 && <li>• {stats.tasksVerified} tareas verificadas</li>}
        {stats.journalEntriesCount > 0 && <li>• {stats.journalEntriesCount} entradas escritas</li>}
        {stats.moodPredominant && <li>• Mood predominante: {stats.moodPredominant}</li>}
        {stats.isBalanced && <li className="text-emerald-300">• Saldo equilibrado ✓</li>}
      </ul>
      {/* E.7 — CTA explícito: sin esto la retro quedaba "pendiente" para siempre */}
      <button
        type="button"
        onClick={onSeen}
        data-testid="journal-retrospective-seen"
        className="mt-2 text-[11px] font-semibold text-amber-300 underline hover:text-amber-200"
      >
        ✓ Marcar como vista
      </button>
    </div>
  )
}
