import { getDailyPhrase } from '../../../utils/dailyPhrase'

export function DailyPhrase() {
  const phrase = getDailyPhrase()
  return (
    <div className="mx-4 mb-3.5 px-3 py-2 rounded-md bg-brand-purple/10 border border-brand-purple/15 text-xs italic text-[#c4b5fd] text-center">
      {phrase}
    </div>
  )
}
