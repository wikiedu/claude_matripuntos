import { Award } from 'lucide-react'
import { BottomNav } from '../components/BottomNav'
import { LevelProgress } from '../components/LevelProgress'
import { AchievementsMap } from '../components/AchievementsMap'

export default function Achievements() {
  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 72 }}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Mis Logros</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-4 pb-24">
          <LevelProgress />
          <AchievementsMap />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
