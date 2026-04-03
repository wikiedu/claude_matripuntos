import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { Navigate } from 'react-router-dom'
import { CalendarDashboard } from '../components/CalendarDashboard'

export const Calendar: React.FC = () => {
  const { isAuthenticated } = useAppStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <CalendarDashboard />
}
