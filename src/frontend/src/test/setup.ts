import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  // localStorage is shared across tests in jsdom; reset between tests
  // to avoid HomeSelector persistence bleed-over.
  window.localStorage.clear()
})
