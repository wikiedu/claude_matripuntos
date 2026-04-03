import { useState } from 'react'
import { Card, CardContent, CardDescription, CardTitle } from './Card'
import { Button } from './Button'
import { Alert } from './Alert'
import { Check, X } from 'lucide-react'
import { TaskPendingLog } from '../types/activity'

interface TaskPendingCardProps {
  taskLog: TaskPendingLog
  onVerify: (taskLogId: string) => Promise<void>
  onReject: (taskLogId: string) => Promise<void>
}

/**
 * TaskPendingCard - Component for displaying pending task verification
 *
 * Displays a task log that is awaiting verification by the partner.
 * Shows the task name, category emoji, who completed it and when,
 * and provides buttons to verify or reject the completion.
 *
 * @param taskLog - The pending task log data
 * @param onVerify - Callback when task is verified
 * @param onReject - Callback when task is rejected
 */
export function TaskPendingCard({ taskLog, onVerify, onReject }: TaskPendingCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Category emoji map
  const categoryEmojiMap: Record<string, string> = {
    cocina: '🍳',
    baños: '🚿',
    limpieza: '🧹',
    compra: '🛒',
    logistica: '📦',
    cuidado: '👶',
    mantenimiento: '🔧',
    jardineria: '🌱',
    mascotas: '🐾',
  }

  const categoryEmoji = categoryEmojiMap[taskLog.task.category] || '✓'

  // Format date to Spanish locale
  const formatDate = (date: Date): string => {
    const d = new Date(date)
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }
    return d.toLocaleDateString('es-ES', options)
  }

  const formattedDate = formatDate(taskLog.date)

  const handleVerify = async () => {
    try {
      setError(null)
      setLoading(true)
      await onVerify(taskLog.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar la tarea')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setError(null)
      setLoading(true)
      await onReject(taskLog.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar la tarea')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      {/* Header with category emoji and task name */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{categoryEmoji}</span>
          <CardTitle className="m-0">{taskLog.task.name}</CardTitle>
        </div>
      </div>

      {/* Subtitle with completed by and date */}
      <CardDescription className="mt-2">
        Completado por {taskLog.completedBy.name} el {formattedDate}
      </CardDescription>

      <CardContent>
        {/* Points display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Puntos base:</span>
            <span className="font-medium">{taskLog.pointsBase} pts</span>
          </div>
          <div className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded">
            <span className="text-blue-700 font-medium">Puntos finales:</span>
            <span className="font-semibold text-blue-700">{taskLog.pointsFinal} pts</span>
          </div>
        </div>

        {/* Error message */}
        {error && <div className="mt-4"><Alert type="error" message={error} /></div>}

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="success"
            size="md"
            onClick={handleVerify}
            disabled={loading}
            isLoading={loading}
            className="flex-1"
          >
            <Check size={18} />
            Verificar
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleReject}
            disabled={loading}
            isLoading={loading}
            className="flex-1"
          >
            <X size={18} />
            Rechazar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
