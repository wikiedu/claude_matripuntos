import { Button } from '../../components/v2/primitives/Button'

interface Props {
  onNext: () => void
}

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-10">
      <div className="w-[96px] h-[96px] rounded-[28px] bg-gradient-to-br from-brand-amber to-brand-purple flex items-center justify-center text-5xl shadow-2xl shadow-brand-purple/40">
        💕
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
          Bienvenida a Matripuntos
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
          Vamos a configurar tu hogar en unos pocos pasos. Podrás ajustar todo
          después desde Ajustes.
        </p>
      </div>
      <div className="w-full mt-4">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          Empezar →
        </Button>
      </div>
      <p className="text-[11px] text-text-tertiary">
        Tardarás menos de un minuto
      </p>
    </div>
  )
}
