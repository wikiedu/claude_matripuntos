import { useEffect, lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { apiClient } from './services/apiClient'
import { useActivities } from './hooks/useActivities'
// Eager: pantallas críticas para LCP (login/signup/landing) + destino
// post-login ("/" → /dashboard) + shell autenticado.
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import { OnboardingLanding } from './pages/onboarding/OnboardingLanding'
import { AuthedLayout } from './layout/AuthedLayout'
import { HomeSelector, HomeView } from './components/v2/home/HomeSelector'
import { CookieConsentBanner } from './components/CookieConsentBanner'
// Fase 2 B.1 — code splitting: el resto de páginas se cargan por ruta.
// Antes: un único chunk de 898KB; ahora chunk principal + uno por página.
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const RequestActivity = lazy(() => import('./pages/RequestActivity'))
const Activities = lazy(() => import('./pages/Activities'))
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Settings = lazy(() => import('./pages/Settings'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })))
const Journal = lazy(() => import('./pages/Journal'))
const Achievements = lazy(() => import('./pages/Achievements'))
const ShoppingListPage = lazy(() => import('./pages/ShoppingListPage'))
const TodoListPage = lazy(() => import('./pages/TodoListPage'))
const Notifications = lazy(() => import('./pages/Notifications'))
const PrivacyPage = lazy(() => import('./pages/legal/Privacy'))
const TermsPage = lazy(() => import('./pages/legal/Terms'))
const CookiesPage = lazy(() => import('./pages/legal/Cookies'))
import './App.css'

// Fallback de Suspense mientras carga el chunk de una ruta — mismo patrón
// visual que el estado isLoading de ProtectedRoute.
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-gray-500 text-sm">Cargando...</div>
    </div>
  )
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      // v2.3.5 — evitar que alt-tab/blur-focus refetche todas las queries
      // y reinicie estado UI mientras el usuario tiene un sheet abierto.
      refetchOnWindowFocus: false,
    },
  },
})

// Protected Route Component
//
// Audit v1.4 P2-F/I: previously authenticated-but-coupleless users landed on
// a blank page because every protected page short-circuits with
// `if (!user || !couple) return null`. Now we steer them explicitly:
//   - not authenticated           → /login
//   - no couple + onboarding open → /onboarding
//   - no couple + onboarding done → /login (zombie state; logout first)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, couple, logout } = useAppStore()

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

  if (!couple) {
    if (user && !user.hasCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />
    }
    // User has completed onboarding but has no couple — invalid state.
    // Clear the token so the login screen doesn't loop back here.
    logout()
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
  const navigate = useNavigate()

  useEffect(() => {
    // Register a 401 handler so the apiClient can reset the Zustand store,
    // purge React Query cache y navegar a /login sin full reload (audit 07).
    // Skip nav si ya estamos en página pública para evitar loops.
    apiClient.setOnUnauthorized(() => {
      useAppStore.getState().reset()
      queryClient.clear()
      const onAuthPage = /^\/(login|signup|onboarding|forgot-password|reset-password|privacy|terms|cookies)/
        .test(window.location.pathname)
      if (!onAuthPage) {
        navigate('/login', { replace: true })
      }
    })
    return () => apiClient.setOnUnauthorized(null)
  }, [navigate])

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
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Cold screens — no AuthedLayout */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding/join/:token" element={<Onboarding />} />

      {/* v1.6.1 — páginas legales públicas */}
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/cookies" element={<CookiesPage />} />

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

      {/* v2.0.2.x — Journaling */}
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <AuthedLayout><Journal /></AuthedLayout>
          </ProtectedRoute>
        }
      />

      {/* v2.7.6 audit 06 S2-3 — /analytics/advanced eliminado: usaba el
           legacy AnalyticsDashboard (13.8KB) que no estaba enlazado en
           ningún sitio del producto. La página /analytics canónica usa
           el aggregator V2 con invariantes matemáticos verificados. */}

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
    </Suspense>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
        <CookieConsentBanner />
      </Router>
    </QueryClientProvider>
  )
}

export default App
