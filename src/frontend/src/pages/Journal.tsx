// v2.0.2.x — Página /journal con UI completa: prompt diario, composer simple
// (texto + tags + shared toggle), feed de entries con reactions, retro modal.

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useJournalEntries, useTodayPrompt, useRetrospectives, type JournalEntry } from '../hooks/useJournal'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'

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
    try {
      await apiClient.request(`/journal/entries/${entryId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
    } catch {}
  }

  async function deleteEntry(id: string) {
    if (!confirm('¿Borrar esta entrada?')) return
    try {
      await apiClient.request(`/journal/entries/${id}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
    } catch {}
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
            onClick={() => setUsePrompt(true)}
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
            <RetrospectiveCard key={r.id} retro={r} />
          ))}
        </section>
      )}

      {/* Feed entries */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">Entradas</p>
        {entries.length === 0 ? (
          <p className="text-xs text-white/50 italic text-center py-8">
            Aún no hay nada escrito. Lo que escribáis aquí queda como vuestro diario compartido.
          </p>
        ) : (
          entries.map(e => (
            <EntryCard
              key={e.id}
              entry={e}
              isMine={e.authorId === user?.id}
              onReact={(emoji) => react(e.id, emoji)}
              onDelete={() => deleteEntry(e.id)}
            />
          ))
        )}
      </section>
    </main>
  )
}

function EntryCard({ entry, isMine, onReact, onDelete }: {
  entry: JournalEntry
  isMine: boolean
  onReact: (emoji: string) => void
  onDelete: () => void
}) {
  const tags = (() => { try { return JSON.parse(entry.tags) as string[] } catch { return [] } })()
  const reactionCounts = new Map<string, number>()
  for (const r of entry.reactions ?? []) {
    reactionCounts.set(r.emoji, (reactionCounts.get(r.emoji) ?? 0) + 1)
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
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(emoji)}
              className="text-base hover:scale-110 transition"
              aria-label={`Reaccionar con ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {reactionCounts.size > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {[...reactionCounts.entries()].map(([emoji, count]) => (
            <span key={emoji} className="text-[11px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full">
              {emoji} {count}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function RetrospectiveCard({ retro }: { retro: any }) {
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
    </div>
  )
}
