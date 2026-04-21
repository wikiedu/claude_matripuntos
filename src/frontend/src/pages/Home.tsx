import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'home_last_selector'
type View = 'tasks' | 'activities'

function readPersisted(): View {
  if (typeof window === 'undefined') return 'tasks'
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'activities' ? 'activities' : 'tasks'
}

export default function Home() {
  const target = readPersisted()
  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/home/${target}`, { replace: true })
  }, [navigate, target])

  return (
    <span data-testid="home-redirecting-to" style={{ display: 'none' }}>{target}</span>
  )
}
