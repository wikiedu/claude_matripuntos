import React, { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, MessageCircle, Loader } from 'lucide-react'
import { Card, CardTitle, CardContent, CardDescription } from './Card'
import { Button } from './Button'
import { Alert } from './Alert'

interface TaskVerificationCardProps {
  id: string
  taskId: string
  taskName: string
  completedByName: string
  date: string
  pointsFinal: number
  status: 'pending' | 'verified' | 'disputed'
  onVerify: (logId: string) => Promise<void>
  onDispute: (logId: string, reason: string, proposedPoints: number) => Promise<void>
  onSkip: () => void
}

export function TaskVerificationCard({
  id,
  taskId,
  taskName,
  completedByName,
  date,
  pointsFinal,
  status,
  onVerify,
  onDispute,
  onSkip,
}: TaskVerificationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [proposedPoints, setProposedPoints] = useState(pointsFinal.toString())
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onVerify(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify task'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      setError('Please provide a reason for disputing this task')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await onDispute(id, disputeReason, parseFloat(proposedPoints))
      setShowDisputeForm(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dispute task'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'disputed':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return <MessageCircle className="w-5 h-5 text-blue-600" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'verified':
        return 'bg-green-50 border-green-200'
      case 'disputed':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (status === 'verified') {
    return (
      <Card className={`${getStatusColor()} border`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-base">{taskName}</CardTitle>
              <CardDescription>
                Completed by {completedByName} on {new Date(date).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-green-600">{pointsFinal} pts</p>
            <p className="text-sm text-gray-600">Verified ✓</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`${getStatusColor()} border`}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1">
            <CardTitle className="text-base">{taskName}</CardTitle>
            <CardDescription>
              Completed by {completedByName} on {new Date(date).toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="font-semibold text-gray-900">{pointsFinal} pts</p>
          <p className="text-sm text-gray-600">Awaiting verification</p>
        </div>
      </div>

      {status === 'disputed' && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-sm text-yellow-800">
          <p className="font-medium">This task is being disputed.</p>
          <p>Awaiting resolution in negotiation.</p>
        </div>
      )}

      {!showDisputeForm ? (
        <div className="flex gap-3 mt-6">
          <Button
            variant="success"
            size="sm"
            onClick={handleVerify}
            isLoading={isLoading}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4" />
            Verify
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDisputeForm(true)}
            disabled={isLoading}
            className="flex-1"
          >
            <AlertCircle className="w-4 h-4" />
            Dispute
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onSkip}
            disabled={isLoading}
            className="flex-1"
          >
            Skip
          </Button>
        </div>
      ) : (
        <div className="space-y-4 mt-6 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Why are you disputing this?
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g., The task wasn't completed fully, or I helped with it..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Proposed points ({pointsFinal} pts suggested)
            </label>
            <input
              type="number"
              value={proposedPoints}
              onChange={(e) => setProposedPoints(e.target.value)}
              min="0.5"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDispute}
              isLoading={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Disputing...' : 'Submit Dispute'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowDisputeForm(false)
                setDisputeReason('')
                setProposedPoints(pointsFinal.toString())
              }}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
