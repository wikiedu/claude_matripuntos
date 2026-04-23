import { useNavigate } from 'react-router-dom'

// Banner sticky arriba del dashboard cuando el usuario aún no tiene pareja
// vinculada. Lleva directo a Settings → Pareja donde está el join-code + link
// para compartir. Petición de UX 2026-04-23: "si entra en su perfil y no
// tiene pareja, le sale un banner rápido para asociar pareja".
export function NoPartnerBanner() {
  const nav = useNavigate()
  return (
    <button
      type="button"
      onClick={() => nav('/settings/couple')}
      className="w-full mx-4 mb-2 rounded-md bg-gradient-to-r from-brand-purple/20 to-brand-amber/20 border border-brand-purple/50 px-4 py-3 text-left hover:from-brand-purple/30 hover:to-brand-amber/30 transition-colors"
      style={{ width: 'calc(100% - 2rem)' }}
      aria-label="Invitar a tu pareja"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl" aria-hidden>💌</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary m-0">
            Invita a tu pareja
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5 m-0">
            Comparte tu código y empezad a sumar Matripuntos juntos.
          </p>
        </div>
        <span className="text-brand-purple font-bold" aria-hidden>→</span>
      </div>
    </button>
  )
}
