import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('jsdom + vitest work', () => {
    const el = document.createElement('div')
    el.textContent = 'hola'
    expect(el.textContent).toBe('hola')
  })
})
