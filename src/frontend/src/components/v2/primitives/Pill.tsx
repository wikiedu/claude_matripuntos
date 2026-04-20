import { ReactNode } from 'react'

type Tone = 'purple' | 'amber' | 'indigo' | 'success' | 'warn' | 'danger'

interface Props { tone?: Tone; children: ReactNode; className?: string }

const tones: Record<Tone, string> = {
  purple:  'bg-brand-purple/15 text-brand-purple border border-brand-purple/30',
  amber:   'bg-brand-amber/15 text-brand-amber border border-brand-amber/30',
  indigo:  'bg-brand-indigo/15 text-[#a5b4fc] border border-brand-indigo/30',
  success: 'bg-success/15 text-success border border-success/30',
  warn:    'bg-warn/15 text-warn border border-warn/30',
  danger:  'bg-danger/15 text-danger border border-danger/30',
}

export function Pill({ tone = 'purple', children, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
