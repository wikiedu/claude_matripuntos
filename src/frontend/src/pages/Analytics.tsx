import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pill } from '../components/v2/primitives/Pill'
import { AnalyticsTabs } from '../components/v2/analytics/AnalyticsTabs'
import { BasicAnalytics } from '../components/v2/analytics/BasicAnalytics'
import { AdvancedAnalytics } from '../components/v2/analytics/AdvancedAnalytics'
import { MovementsTab } from '../components/v2/analytics/MovementsTab'
import { PremiumInterestModal } from '../components/v2/premium/PremiumInterestModal'

type Tab = 'basic' | 'advanced' | 'movements'

export default function Analytics() {
  const [params] = useSearchParams()
  const initial: Tab = (params.get('tab') as Tab) === 'movements' ? 'movements'
                     : (params.get('tab') as Tab) === 'advanced'  ? 'advanced'
                     : 'basic'
  const [tab, setTab] = useState<Tab>(initial)
  const [interestOpen, setInterestOpen] = useState(false)
  const isPremium = false  // v1.4: todos son free

  const month = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date().getMonth()]

  return (
    <main className="pt-1">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-[22px] font-extrabold text-text-primary m-0">Analítica</h2>
        <Pill tone="purple">{month}</Pill>
      </div>
      <AnalyticsTabs tab={tab} onTab={setTab} isPremium={isPremium} />
      {tab === 'basic'     && <BasicAnalytics />}
      {tab === 'advanced'  && <AdvancedAnalytics isPremium={isPremium} onOpenInterest={() => setInterestOpen(true)} />}
      {tab === 'movements' && <MovementsTab />}
      <div style={{ height: 20 }} />
      <PremiumInterestModal open={interestOpen} onClose={() => setInterestOpen(false)} source="analytics_advanced_overlay" />
    </main>
  )
}
