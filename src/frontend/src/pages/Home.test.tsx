import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import Home from './Home'

beforeEach(() => window.localStorage.clear())

describe('Home', () => {
  it('redirects to /home/tasks by default when no persisted choice', () => {
    renderWithProviders(<Home />, { route: '/home', path: '/home/*' })
    expect(screen.getByTestId('home-redirecting-to')).toHaveTextContent('tasks')
  })

  it('redirects to /home/activities when persisted', () => {
    window.localStorage.setItem('home_last_selector', 'activities')
    renderWithProviders(<Home />, { route: '/home', path: '/home/*' })
    expect(screen.getByTestId('home-redirecting-to')).toHaveTextContent('activities')
  })
})
