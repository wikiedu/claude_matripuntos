import { useState, useEffect } from 'react'
import { Loader, AlertCircle, TrendingUp } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface PointsBreakdownProps {
  eventId: string
  currentPoints?: number
}

interface Breakdown {
  basePoints: number
  multipliers: {
    [key: string]: {
      value: number
      label: string
    }
  }
  totalMultiplier: number
  calculatedPoints: number
  finalPoints: number
}

export default function PointsBreakdown({ eventId, currentPoints }: PointsBreakdownProps) {
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBreakdown()
  }, [eventId])

  const loadBreakdown = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.pointsV2.calculateBreakdown(eventId)
      setBreakdown(response.breakdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load breakdown')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 py-4">
        <Loader className="w-4 h-4 animate-spin" />
        Calculando puntos...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex gap-2 text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    )
  }

  if (!breakdown) {
    return null
  }

  const multiplierEntries = Object.entries(breakdown.multipliers).map(([key, data]) => ({
    key,
    ...data,
  }))

  return (
    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 font-semibold text-blue-900">
        <TrendingUp className="w-5 h-5" />
        Desglose de Puntos
      </div>

      {/* Base points */}
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-white rounded border border-blue-100">
          <span className="text-gray-700">Puntos base</span>
          <span className="font-bold text-lg">{breakdown.basePoints}</span>
        </div>

        {/* Multipliers */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-blue-900">Multiplicadores aplicados:</p>
          {multiplierEntries.map((mult) => (
            <div
              key={mult.key}
              className="flex justify-between items-center p-2 bg-white rounded text-sm"
            >
              <span className="text-gray-700">{mult.label}</span>
              <span className="font-semibold text-blue-600">×{mult.value.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Total multiplier */}
        <div className="flex justify-between items-center p-3 bg-blue-100 rounded border border-blue-300 font-semibold">
          <span>Multiplicador total</span>
          <span className="text-lg">×{breakdown.totalMultiplier.toFixed(2)}</span>
        </div>

        {/* Calculation */}
        <div className="text-center py-2 text-sm text-blue-800 bg-white rounded border border-blue-100">
          <p>
            {breakdown.basePoints} × {breakdown.totalMultiplier.toFixed(2)} ={' '}
            <span className="font-bold">{breakdown.calculatedPoints.toFixed(1)}</span>
          </p>
        </div>

        {/* Final points */}
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-primary-50 to-secondary-50 rounded border-2 border-primary">
          <span className="font-bold text-gray-900">Puntos Finales</span>
          <span className="text-3xl font-bold text-primary">{breakdown.finalPoints}</span>
        </div>

        {breakdown.finalPoints === 500 && (
          <div className="p-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded">
            ⚠️ Puntos capped en máximo de 500
          </div>
        )}

        {currentPoints && currentPoints !== breakdown.finalPoints && (
          <div className="p-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded">
            Cambio: {currentPoints} → {breakdown.finalPoints} pts
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-blue-700 space-y-1">
        <p>💡 Los multiplicadores se basan en:</p>
        <ul className="list-disc list-inside">
          <li>Hora del día (mañana, tarde, noche)</li>
          <li>Día de la semana (fin de semana +15%)</li>
          <li>Si trabajaste ese día (+20%)</li>
          <li>Hijos a cargo (×1.4 a ×2.2)</li>
          <li>Impacto de la actividad (-30% a +20%)</li>
        </ul>
      </div>
    </div>
  )
}
