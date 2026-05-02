import { InputHTMLAttributes, forwardRef, useId } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, className = '', id, ...rest }, ref
) {
  // v1.6.2 fix S1-12 (WCAG 3.3.1): asociación ARIA explícita entre input y
  // su mensaje de error/hint para que screen readers los lean juntos.
  const reactId = useId()
  const inputId = id ?? `input-${reactId}`
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary">{label}</label>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 ${error ? 'border-danger' : ''} ${className}`}
        {...rest}
      />
      {hint && !error && <span id={hintId} className="text-[11px] text-text-tertiary">{hint}</span>}
      {error && <span id={errorId} className="text-[11px] text-danger" role="alert">{error}</span>}
    </div>
  )
})
