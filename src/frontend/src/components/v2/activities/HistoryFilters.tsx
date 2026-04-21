import { ReactNode } from 'react'

export type HistoryFilterValues = {
  status: 'all' | 'accepted' | 'rejected' | 'forced'
  who: 'all' | 'me' | 'partner'
  range: 'week' | 'month' | 'all'
}

interface Props {
  partnerName: string
  value: HistoryFilterValues
  onChange: (v: HistoryFilterValues) => void
}

export function HistoryFilters({ partnerName, value, onChange }: Props) {
  const set = <K extends keyof HistoryFilterValues>(k: K, v: HistoryFilterValues[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <div className="px-4 py-2 flex flex-col gap-2">
      <Row>
        <Chip active={value.status === 'all'}      onClick={() => set('status', 'all')}>Todos</Chip>
        <Chip active={value.status === 'accepted'} onClick={() => set('status', 'accepted')}>Aprobadas</Chip>
        <Chip active={value.status === 'rejected'} onClick={() => set('status', 'rejected')}>Rechazadas</Chip>
        <Chip active={value.status === 'forced'}   onClick={() => set('status', 'forced')}>Forzadas</Chip>
      </Row>
      <Row>
        <Chip active={value.who === 'all'}     onClick={() => set('who', 'all')}>Todos</Chip>
        <Chip active={value.who === 'me'}      onClick={() => set('who', 'me')}>Yo</Chip>
        <Chip active={value.who === 'partner'} onClick={() => set('who', 'partner')}>{partnerName}</Chip>
      </Row>
      <Row>
        <Chip active={value.range === 'week'}  onClick={() => set('range', 'week')}>Semana</Chip>
        <Chip active={value.range === 'month'} onClick={() => set('range', 'month')}>Mes</Chip>
        <Chip active={value.range === 'all'}   onClick={() => set('range', 'all')}>Todo</Chip>
      </Row>
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex gap-1.5 overflow-x-auto">{children}</div>
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border transition-colors',
        active
          ? 'bg-brand-amber text-white border-brand-amber'
          : 'bg-surface-elevated text-text-secondary border-brd-subtle',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
