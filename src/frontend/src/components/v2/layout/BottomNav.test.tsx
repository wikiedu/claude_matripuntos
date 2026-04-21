import { describe, it, expect } from 'vitest'
import { screen, render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './BottomNav'

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={<BottomNav onFab={() => {}} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  it('has Hogar label instead of Tareas', () => {
    renderAt('/home/tasks')
    expect(screen.getByText('Hogar')).toBeInTheDocument()
    expect(screen.queryByText('Tareas')).not.toBeInTheDocument()
  })

  it('highlights Hogar when on /home/tasks', () => {
    renderAt('/home/tasks')
    const label = screen.getByText('Hogar')
    expect(label.className).toMatch(/brand-amber/)
  })

  it('highlights Hogar when on /home/activities', () => {
    renderAt('/home/activities')
    const label = screen.getByText('Hogar')
    expect(label.className).toMatch(/brand-amber/)
  })
})
