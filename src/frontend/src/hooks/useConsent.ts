// v1.6.1 — Hook reactivo para consent. Lee la cookie al montar y expone
// setConsent que escribe + actualiza estado local. hasResponded distingue
// "user nunca contestó" (mostrar banner) de "user dijo no" (no mostrar).

import { useState, useEffect, useCallback } from 'react'
import { readConsent, writeConsent, type Consent } from '../services/consent'

export function useConsent() {
  const [consent, setConsentState] = useState<Consent | null>(() => readConsent())

  const setConsent = useCallback((partial: { analytics: boolean }) => {
    writeConsent(partial)
    setConsentState(readConsent())
  }, [])

  useEffect(() => {
    const onStorage = () => setConsentState(readConsent())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { consent, setConsent, hasResponded: consent !== null }
}
