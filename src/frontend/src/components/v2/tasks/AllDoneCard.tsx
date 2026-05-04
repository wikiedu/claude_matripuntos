// v2.3.0 — Hero card "Todo al día" (Claude Design canvas 15).
// Aparece cuando todas las tareas de hoy están done. Mensaje cálido sin
// fanfarria (es lo cotidiano, no un casino).

interface Props {
  totalMpToday: number          // suma del día entre los dos
  pendingThisWeek?: number      // mañana o esta semana, si aplica
}

export function AllDoneCard({ totalMpToday, pendingThisWeek }: Props) {
  return (
    <div
      className="mx-4 my-3 p-4 text-center rounded-2xl border"
      style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(168,85,247,0.06))',
        borderColor: 'rgba(34,197,94,0.30)',
      }}
    >
      <div aria-hidden className="text-3xl mb-1.5">✨</div>
      <p className="m-0 text-sm font-extrabold text-text-primary">Todo al día</p>
      <p className="m-0 mt-1 text-xs text-text-secondary leading-relaxed">
        Hoy cerráis con <strong className="text-success font-bold">+{totalMpToday.toFixed(0)} MP</strong> entre los dos.
        {pendingThisWeek && pendingThisWeek > 0 && (
          <> Mañana hay {pendingThisWeek} {pendingThisWeek === 1 ? 'más esperando' : 'más esperando'}.</>
        )}
      </p>
    </div>
  )
}

export default AllDoneCard
