// v2.7.4 audit 09 S2-U-7 / 06 S2-9 — Skeleton primitive canónico.
// Antes había 4 patrones distintos de loading state (Loader spin,
// "Cargando..." plano, animate-pulse manual, sin skeleton). Esto los
// unifica.

interface SkeletonProps {
  className?: string  // tailwind classes para tamaño (h-X w-Y rounded-Z)
  variant?: 'block' | 'text' | 'circle'
}

export function Skeleton({ className = '', variant = 'block' }: SkeletonProps) {
  const base = 'bg-surface-card animate-pulse motion-reduce:animate-none'
  const shape = variant === 'circle'
    ? 'rounded-full'
    : variant === 'text'
      ? 'rounded h-3'
      : 'rounded-md'
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando"
      className={`${base} ${shape} ${className}`}
    />
  )
}

// Helpers semánticos para casos comunes — evitan repetir className.
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3 rounded-md bg-surface-card border border-brd-subtle">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="text" className={i === 0 ? 'w-1/2' : 'w-full'} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
