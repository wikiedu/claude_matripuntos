// v1.6 — Frase del día con cascada por urgencia emocional. Tipografía
// italic serif para que se sienta "frase" y no "label". Si no hay couple,
// no renderiza (página de login/onboarding nunca lo monta de todas formas).
// v1.6.1 — Telemetry: dispara phrase.daily_seen al render con la categoría.

import { useEffect } from 'react'
import { useDailyPhraseState } from '../../../hooks/useDailyPhraseState'
import { getDailyPhrase } from '../../../utils/dailyPhrase'
import { useAppStore } from '../../../store/useAppStore'
import { telemetry } from '../../../services/telemetry'

export function DailyPhrase() {
  const couple = useAppStore(s => s.couple)
  if (!couple?.id) return null

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'
  const state = useDailyPhraseState({ coupleId: couple.id, tz })
  const phrase = getDailyPhrase(state)

  // v1.6.1 — telemetry: cuenta cada vez que se ve una frase. useEffect con
  // phrase.id evita doble disparo en re-renders sin cambio.
  useEffect(() => {
    void telemetry.track('phrase.daily_seen', { category: phrase.category })
  }, [phrase.id, phrase.category])

  return (
    <div
      data-testid="daily-phrase"
      data-category={phrase.category}
      className="mx-4 mb-3.5 px-4 py-3 rounded-xl bg-brand-purple/10 border border-brand-purple/15 transition-opacity duration-200"
    >
      <p className="font-serif italic text-sm text-violet-300 leading-snug text-center">
        "{phrase.text}"
      </p>
    </div>
  )
}
