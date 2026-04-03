import { AlertCircle, CheckCircle, InfoIcon, XCircle } from 'lucide-react'

interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info'
  title?: string
  message: string
  onClose?: () => void
}

export function Alert({ type, title, message, onClose }: AlertProps) {
  const config = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <InfoIcon className="w-5 h-5 text-blue-600" />,
    },
  }

  const { bg, border, text, icon } = config[type]

  return (
    <div className={`${bg} ${border} border rounded-lg p-4 flex gap-3`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        {title && <h3 className={`${text} font-medium`}>{title}</h3>}
        <p className={`${text} text-sm`}>{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className={`${text} hover:opacity-70 transition-opacity`}>
          <span className="text-xl">&times;</span>
        </button>
      )}
    </div>
  )
}
