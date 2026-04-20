import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, className = '', ...rest }, ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-text-secondary">{label}</label>}
      <input
        ref={ref}
        className={`bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 ${error ? 'border-danger' : ''} ${className}`}
        {...rest}
      />
      {hint && !error && <span className="text-[11px] text-text-tertiary">{hint}</span>}
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  )
})
