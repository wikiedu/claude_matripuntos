import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { TaskVerificationCard } from '../components/TaskVerificationCard'
import { Button } from '../components/Button'
import { Alert } from '../components/Alert'
import { Card, CardTitle, CardContent, CardDescription } from '../components/Card'

interface Task {
  id: string
  name: string
  category: string
  pointsBase: string
  description?: string
}

interface TaskLog {
  id: string
  date: string
  pointsFinal: number
  status: 'pending' | 'verified' | 'disputed'
  completedBy: { id: string; name: string } | null
  verifiedBy: { id: string; name: string } | null
}

interface PageProps {
  onBack?: () => void
}

export default function Tasks({ onBack }: PageProps) {
  const navigate = useNavigate()
  const { user, couple } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [view, setView] = useState<'today' | 'pending' | 'history'>('today')

  // Load tasks on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch all tasks
        const tasksResponse = await apiClient.tasks.getAll()
        setTasks(tasksResponse.tasks || [])

        // Fetch today's logs (mock - would filter by date in real app)
        // This is a simplified version; in production, you'd call a specific endpoint
        const today = new Date().toISOString().split('T')[0]
        setTaskLogs([])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load tasks'
        setError(message)
        console.error('Failed to load tasks:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (couple?.id) {
      loadData()
    }
  }, [couple?.id])

  const handleVerify = async (logId: string) => {
    try {
      // Find the task log to get taskId
      const taskLog = taskLogs.find((t) => t.id === logId)
      if (!taskLog) return

      // Call verify endpoint
      // const response = await apiClient.tasks.verifyLog(taskId, logId)

      setSuccessMessage('Task verified successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)

      // Refresh logs
      setTaskLogs((logs) => logs.filter((l) => l.id !== logId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify task'
      setError(message)
    }
  }

  const handleDispute = async (
    logId: string,
    reason: string,
    proposedPoints: number
  ) => {
    try {
      // Find the task log
      const taskLog = taskLogs.find((t) => t.id === logId)
      if (!taskLog) return

      // Call dispute endpoint
      // const response = await apiClient.tasks.disputeLog(taskId, logId, { disputeReason: reason, pointsDisputed: proposedPoints })

      setSuccessMessage('Dispute submitted! Awaiting response...')
      setTimeout(() => setSuccessMessage(null), 3000)

      // Update status to disputed
      setTaskLogs((logs) =>
        logs.map((l) => (l.id === logId ? { ...l, status: 'disputed' } : l))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dispute task'
      setError(message)
    }
  }

  const handleSkip = () => {
    // In real app, would mark as skipped/reviewed
    console.log('Skipped')
  }

  const otherUser = couple?.users?.find((u) => u.id !== user?.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            ) : (
              <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Tareas Diarias</h1>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {successMessage && (
          <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {(['today', 'pending', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                view === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'today' && 'Tareas de Hoy'}
              {tab === 'pending' && 'Pendientes de Verificar'}
              {tab === 'history' && 'Historial'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mr-2" />
            <span className="text-gray-600">Cargando tareas...</span>
          </div>
        ) : view === 'today' ? (
          <div className="space-y-6">
            {tasks.length === 0 ? (
              <Card>
                <CardContent>
                  <p className="text-gray-500 text-center py-8">
                    No tasks created yet. Create your first task!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {tasks.map((task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{task.name}</CardTitle>
                          {task.description && (
                            <CardDescription>{task.description}</CardDescription>
                          )}
                          <p className="text-sm text-gray-500 mt-2">
                            Category: <span className="font-medium text-gray-700">{task.category}</span>
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-blue-600">{task.pointsBase}</p>
                          <p className="text-sm text-gray-500">pts</p>
                        </div>
                      </div>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                          Mark this task as completed when you finish it.
                        </p>
                        <Button variant="success" size="md" className="w-full">
                          <CheckCircle className="w-4 h-4" />
                          Mark as Done
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : view === 'pending' ? (
          <div className="space-y-6">
            {taskLogs.filter((l) => l.status === 'pending' || l.status === 'disputed').length === 0 ? (
              <Card>
                <CardContent>
                  <p className="text-gray-500 text-center py-8">
                    No tasks pending verification.
                  </p>
                </CardContent>
              </Card>
            ) : (
              taskLogs
                .filter((l) => l.status === 'pending' || l.status === 'disputed')
                .map((log) => (
                  <TaskVerificationCard
                    key={log.id}
                    id={log.id}
                    taskId="dummy"
                    taskName={`Task ${log.id}`}
                    completedByName={log.completedBy?.name || 'Unknown'}
                    date={log.date}
                    pointsFinal={log.pointsFinal}
                    status={log.status}
                    onVerify={handleVerify}
                    onDispute={handleDispute}
                    onSkip={handleSkip}
                  />
                ))
            )}
          </div>
        ) : (
          <Card>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                Task history coming soon.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
