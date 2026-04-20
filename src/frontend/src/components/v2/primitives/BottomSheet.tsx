import { ReactNode, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[80] animate-in fade-in"
      />
      <div className="fixed left-0 right-0 bottom-0 z-[81] max-w-[500px] mx-auto bg-surface-elevated border-t border-brd-purple rounded-t-xl p-4 pb-6 animate-in slide-in-from-bottom duration-200">
        {title && <h3 className="text-base font-bold text-text-primary mb-3">{title}</h3>}
        {children}
      </div>
    </>
  )
}
