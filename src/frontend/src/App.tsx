import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { apiClient } from './services/apiClient'
import { useActivities } from './hooks/useActivities'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import RequestActivity from './pages/RequestActivity'
import Activities from './pages/Activities'
import ActivityDetail from './pages/ActivityDetail'
import Tasks from './pages/Tasks'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import { Calendar } from './pages/Calendar'
import { AnalyticsPage } from './pages/AnalyticsPage'
import Achievements from './pages/Achievements'
import ShoppingListPage from './pages/ShoppingListPage'
import TodoListPage from './pages/TodoListPage'
import Notifications from './pages/Notifications'
import NotFound from './pages/NotFound'
import Home from './pages/Home'
import { OnboardingLanding } from './pages/onboarding/OnboardingLanding'
import { AuthedLayout } from './layout/AuthedLayout'
import { HomeSelector, HomeView } from './components/v2/home/HomeSelector'
import './App.css'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
    },
  },
})

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAppStore()

  // While we're checking a stored token, render nothing to avoid a flash redirect
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm">Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// HomeShell — inline wrapper for /home/tasks and /home/activities
function HomeShell({ view, children }: {
  view: HomeView
  children: React.ReactNode
}) {
  const nav = useNavigate()
  const { pendingCount } = useActivities()
  useEffect(() => {
    window.localStorage.setItem('home_last_selector', view)
  }, [view])
  return (
    <>
      <HomeSelector
        active={view}
        activitiesCount={pendingCount}
        onChange={(v) => nav(`/home/${v}`)}
      />
      {children}
    </>
  )
}

// App Routes Component
function AppRoutes() {
  const { isAuthenticated, loadUserData } = useAppStore()

  useEffect(() => {
    // Register a 401 handler so the apiClient can reset the Zustand store and
    // purge React Query cache without importing the store directly (circular).
    apiClient.setOnUnauthorized(() => {
      useAppStore.getState().reset()
      queryClient.clear()
    })
    return () => apiClient.setOnUnauthorized(null)
  }, [])

  useEffect(() => {
    // Check if user has a token and try to load their data
    const token = apiClient.getToken()
    if (token && !isAuthenticated) {
      loadUserData().catch(() => {
        // Token is invalid, user will be redirected to login
      })
    }
  }, [isAuthenticated, loadUserData])

  return (
    <Routes>
      {/* Cold screens — no AuthedLayout */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding/join/:token" element={<Onboarding />} />

      {/* Authenticated app shell */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuthedLayout><Dashboard /></AuthedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/request-activity"
        element={
          <ProtectedRoute>
            <AuthedLayout><RequestActivity /></AuthedLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy redirects */}
      <Route path="/inbox" element={<Navigate to="/home/activities" replace />} />
      <Route path="/request-inbox" element={<Navigate to="/home/activities" replace />} />

      {/* /home/* routes */}
      <Route
        path="/home"
        element={<ProtectedRoute><AuthedLayout><Home /></AuthedLayout></ProtectedRoute>}
      />
      <Route
        path="/home/tasks"
        element={
          <ProtectedRoute>
            <AuthedLayout>
              <HomeShell view="tasks">
                <Tasks />
              </HomeShell>
            </AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/activities"
        element={
          <ProtectedRoute>
            <AuthedLayout>
              <HomeShell view="activities">
                <Activities />
              </HomeShell>
            </AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/activities/:id"
        element={
          <ProtectedRoute>
            <AuthedLayout><ActivityDetail /></AuthedLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy redirect */}
      <Route path="/tasks" element={<Navigate to="/home/tasks" replace />} />

      {/* History legacy route → redirect to Analytics movements tab */}
      <Route path="/history" element={<Navigate to="/analytics?tab=movements" replace />} />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AuthedLayout><Settings /></AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/:section"
        element={
          <ProtectedRoute>
            <AuthedLayout><Settings /></AuthedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AuthedLayout><Analytics /></AuthedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <AuthedLayout><Calendar /></AuthedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics/advanced"
        element={
          <ProtectedRoute>
            <AuthedLayout><AnalyticsPage /></AuthedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <AuthedLayout><Achievements /></AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AuthedLayout><Notifications /></AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shopping"
        element={
          <ProtectedRoute>
            <AuthedLayout><ShoppingListPage /></AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <AuthedLayout><TodoListPage /></AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" replace />
            : <OnboardingLanding />
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
      </Router>
    </QueryClientProvider>
  )
}

export default App
