type Tab = 'badges' | 'ranking' | 'historial'

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
}

export function AchievementsTabs({ tab, onTab }: Props) {
  function btn(id: Tab, label: string, extraActive: string) {
    const active = tab === id
    return (
      <button
        onClick={() => onTab(id)}
        className={`flex-1 py-2.5 rounded-md border-0 text-[13px] font-bold transition ${
          active ? `${extraActive} text-white shadow-lg` : 'bg-transparent text-text-secondary'
        }`}
      >
        {label}
      </button>
    )
  }
  return (
    <div className="mx-4 mb-4 flex gap-1.5 p-1 bg-[rgba(26,16,53,0.6)] border border-brand-purple/15 rounded-lg">
      {btn('badges',    '🏅 Badges',    'bg-grad-hero')}
      {btn('ranking',   '📊 Ranking',   'bg-grad-cta')}
      {btn('historial', '📜 Historial', 'bg-gradient-to-br from-brand-purple to-brand-purple-dark')}
    </div>
  )
}
