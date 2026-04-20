interface Props {
  tab: 'basic' | 'advanced' | 'movements'
  onTab: (t: 'basic' | 'advanced' | 'movements') => void
  isPremium: boolean
}

export function AnalyticsTabs({ tab, onTab, isPremium }: Props) {
  function btn(id: 'basic' | 'advanced' | 'movements', label: string, extraActive: string) {
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
      {btn('basic',    '📊 Básico',                                 'bg-grad-hero')}
      {btn('advanced', `📈 Avanzado ${!isPremium ? '🔒' : ''}`,      'bg-grad-cta')}
      {btn('movements','📜 Movimientos',                            'bg-gradient-to-br from-brand-purple to-brand-purple-dark')}
    </div>
  )
}
