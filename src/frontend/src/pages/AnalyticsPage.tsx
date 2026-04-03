import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { Navigate } from 'react-router-dom'
import { AnalyticsDashboard } from '../components/AnalyticsDashboard'

export const AnalyticsPage: React.FC = () => {
  const { isAuthenticated } = useAppStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <AnalyticsDashboard />
}
