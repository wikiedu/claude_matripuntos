import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'

function RedirectRoutes() {
  return (
    <Routes>
      <Route path="/tasks" element={<Navigate to="/home/tasks" replace />} />
      <Route path="/inbox" element={<Navigate to="/home/activities" replace />} />
      <Route path="/request-inbox" element={<Navigate to="/home/activities" replace />} />
      <Route path="/home/tasks" element={<div data-testid="page">home-tasks</div>} />
      <Route path="/home/activities" element={<div data-testid="page">home-activities</div>} />
    </Routes>
  )
}

describe('legacy redirects', () => {
  it.each([
    ['/tasks', 'home-tasks'],
    ['/inbox', 'home-activities'],
    ['/request-inbox', 'home-activities'],
  ])('%s redirects to %s', (from, target) => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={[from]}>
        <RedirectRoutes />
      </MemoryRouter>,
    )
    expect(getByTestId('page').textContent).toBe(target)
  })
})
