// v2.2.9 — Tween numérico para el balance hero (Claude Design canvas 13).
// Anima de su valor previo al nuevo. Sólo cuando el valor cambia tras mount.

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  decimals?: number
  duration?: number      // ms (default 700)
  className?: string
  style?: React.CSSProperties
}

const EASE = (t: number) => 1 - Math.pow(1 - t, 3)  // ease-out cubic

export function AnimatedNumber({
  value, decimals = 1, duration = 700, className, style,
}: Props) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const firstMountRef = useRef(true)

  useEffect(() => {
    // En el primer mount no animamos: que aparezca con el valor real ya.
    if (firstMountRef.current) {
      firstMountRef.current = false
      setDisplay(value)
      fromRef.current = value
      return
    }
    fromRef.current = display
    startRef.current = null
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t
      const elapsed = t - startRef.current
      const progress = Math.min(1, elapsed / duration)
      const eased = EASE(progress)
      const next = fromRef.current + (value - fromRef.current) * eased
      setDisplay(next)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  const sign = display >= 0 ? '+' : ''
  return (
    <span className={className} style={style}>
      {sign}{display.toFixed(decimals)}
    </span>
  )
}

export default AnimatedNumber
