import { Card } from '../../primitives/Card'

interface Bullet { tone: 'success' | 'warn' | 'neutral'; text: string }
interface Props { text: string; bullets: Bullet[] }

const toneClass: Record<string, string> = {
  success: 'text-success',
  warn:    'text-warn',
  neutral: 'text-text-secondary',
}

export function MonthlyInsightCard({ text, bullets }: Props) {
  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">💬 Insight mensual</div>
        <div className="text-[11px] text-text-secondary mt-0.5">Resumen generado automáticamente</div>
      </div>
      <Card style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(168,85,247,0.08))' }}>
        <div className="text-[13px] text-text-primary leading-relaxed">{text}</div>
        {bullets.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
            {bullets.map((b, i) => (
              <span key={i} className={`font-semibold ${toneClass[b.tone]}`}>
                {b.tone === 'success' ? '✓ ' : b.tone === 'warn' ? '⚠ ' : ''}{b.text}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
