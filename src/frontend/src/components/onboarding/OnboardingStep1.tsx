import { useState } from 'react'
import { User, Briefcase, Heart, X, Clock } from 'lucide-react'

interface DaySchedule {
  enabled: boolean
  startTime: string
  endTime: string
  mode: 'presencial' | 'teletrabajo'
}

interface WeekSchedule {
  lunes: DaySchedule
  martes: DaySchedule
  miercoles: DaySchedule
  jueves: DaySchedule
  viernes: DaySchedule
  sabado: DaySchedule
  domingo: DaySchedule
}

type DayKey = keyof WeekSchedule

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'lunes', label: 'Lunes', short: 'L' },
  { key: 'martes', label: 'Martes', short: 'M' },
  { key: 'miercoles', label: 'Miércoles', short: 'X' },
  { key: 'jueves', label: 'Jueves', short: 'J' },
  { key: 'viernes', label: 'Viernes', short: 'V' },
  { key: 'sabado', label: 'Sábado', short: 'S' },
  { key: 'domingo', label: 'Domingo', short: 'D' },
]

const DEFAULT_SCHEDULE: WeekSchedule = {
  lunes:    { enabled: true,  startTime: '09:00', endTime: '18:00', mode: 'presencial' },
  martes:   { enabled: true,  startTime: '09:00', endTime: '18:00', mode: 'presencial' },
  miercoles:{ enabled: true,  startTime: '09:00', endTime: '18:00', mode: 'presencial' },
  jueves:   { enabled: true,  startTime: '09:00', endTime: '18:00', mode: 'presencial' },
  viernes:  { enabled: true,  startTime: '09:00', endTime: '14:00', mode: 'presencial' },
  sabado:   { enabled: false, startTime: '09:00', endTime: '14:00', mode: 'presencial' },
  domingo:  { enabled: false, startTime: '09:00', endTime: '14:00', mode: 'presencial' },
}

interface Step1Props {
  data: any
  onChange: (data: any, nextStep?: number) => void
}

export default function OnboardingStep1({ data, onChange }: Step1Props) {
  const [lovesInput, setLovesInput] = useState('')
  const [dislikesInput, setDislikesInput] = useState('')

  const schedule: WeekSchedule = data.weekSchedule || DEFAULT_SCHEDULE

  const handleChange = (field: string, value: any) => {
    onChange({ [field]: value })
  }

  const updateDaySchedule = (day: DayKey, field: keyof DaySchedule, value: any) => {
    const newSchedule: WeekSchedule = {
      ...schedule,
      [day]: { ...schedule[day], [field]: value },
    }
    handleChange('weekSchedule', newSchedule)
  }

  const addPreference = (type: 'loves' | 'dislikes', value: string) => {
    if (!value.trim()) return
    const key = type === 'loves' ? 'taskPreferencesLoves' : 'taskPreferencesDislikes'
    const preferences = data[key] || []
    if (!preferences.includes(value.trim())) {
      onChange({ [key]: [...preferences, value.trim()] })
    }
  }

  const removePreference = (type: 'loves' | 'dislikes', value: string) => {
    const key = type === 'loves' ? 'taskPreferencesLoves' : 'taskPreferencesDislikes'
    const preferences = data[key] || []
    onChange({ [key]: preferences.filter((p: string) => p !== value) })
  }

  // Calculate total weekly hours from schedule
  const totalWeeklyHours = Object.values(schedule).reduce((total, day) => {
    if (!day.enabled) return total
    const [sh, sm] = day.startTime.split(':').map(Number)
    const [eh, em] = day.endTime.split(':').map(Number)
    const hours = (eh + em / 60) - (sh + sm / 60)
    return total + Math.max(0, hours)
  }, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Tu Perfil Personal
        </h2>
        <p className="text-gray-600">Cuéntanos un poco sobre ti para personalizar tu experiencia</p>
      </div>

      {/* Nombre y apellido */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
          <input type="text" value={data.name || ''} disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            placeholder="Tu nombre" />
          <p className="text-xs text-gray-500 mt-1">Definido durante el registro</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
          <input type="text" value={data.surname || ''}
            onChange={e => handleChange('surname', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Tu apellido" />
        </div>
      </div>

      {/* Fecha de nacimiento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de nacimiento</label>
        <input type="date" value={data.dateOfBirth || ''}
          onChange={e => handleChange('dateOfBirth', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
      </div>

      {/* Horario Laboral */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Horario Laboral
          </h3>
          {totalWeeklyHours > 0 && (
            <span className="text-sm bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-full font-medium">
              ~{Math.round(totalWeeklyHours)}h/semana
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Indica para cada día tu horario fuera de casa y si es presencial o teletrabajo.
          Esto nos ayuda a calcular mejor el impacto de las actividades.
        </p>

        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const day = schedule[key]
            return (
              <div key={key} className={`rounded-xl border-2 transition-all ${
                day.enabled ? 'border-primary border-opacity-40 bg-white' : 'border-gray-200 bg-gray-50'
              }`}>
                {/* Header del día */}
                <div className="flex items-center gap-3 p-3">
                  <label className="flex items-center gap-2 cursor-pointer min-w-[100px]">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={e => updateDaySchedule(key, 'enabled', e.target.checked)}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <span className={`text-sm font-semibold ${day.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </label>

                  {day.enabled && (
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      {/* Horas */}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={e => updateDaySchedule(key, 'startTime', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-1 focus:ring-primary w-[90px]"
                        />
                        <span className="text-gray-400 text-xs">→</span>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={e => updateDaySchedule(key, 'endTime', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-1 focus:ring-primary w-[90px]"
                        />
                      </div>

                      {/* Modalidad */}
                      <div className="flex gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={() => updateDaySchedule(key, 'mode', 'presencial')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            day.mode === 'presencial'
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-gray-100 text-gray-500 border border-transparent hover:border-gray-200'
                          }`}
                        >
                          🏢 Presencial
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDaySchedule(key, 'mode', 'teletrabajo')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            day.mode === 'teletrabajo'
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-100 text-gray-500 border border-transparent hover:border-gray-200'
                          }`}
                        >
                          🏠 Teletrabajo
                        </button>
                      </div>
                    </div>
                  )}

                  {!day.enabled && (
                    <span className="text-xs text-gray-400 ml-1">Día libre / no laboral</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Resumen */}
        {totalWeeklyHours > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-700">
              <strong>Resumen:</strong> {Object.values(schedule).filter(d => d.enabled).length} días laborales ·{' '}
              {Math.round(totalWeeklyHours)} horas semanales ·{' '}
              {Object.values(schedule).filter(d => d.enabled && d.mode === 'teletrabajo').length > 0
                ? `${Object.values(schedule).filter(d => d.enabled && d.mode === 'teletrabajo').length} días en teletrabajo`
                : 'todo presencial'}
            </p>
          </div>
        )}
      </div>

      {/* Preferencias de tareas */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          Preferencias de Tareas del Hogar
        </h3>

        {/* Me encanta */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">😍 Me encanta hacer:</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={lovesInput}
              onChange={e => setLovesInput(e.target.value)}
              placeholder="Ej: cocinar, limpiar baños, compras..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPreference('loves', lovesInput)
                  setLovesInput('')
                }
              }}
            />
            <button type="button"
              onClick={() => { addPreference('loves', lovesInput); setLovesInput('') }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.taskPreferencesLoves || []).map((pref: string) => (
              <div key={pref} className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center gap-1.5 text-sm">
                {pref}
                <button onClick={() => removePreference('loves', pref)} className="hover:bg-green-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* No me gusta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">😤 Prefiero no hacer:</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={dislikesInput}
              onChange={e => setDislikesInput(e.target.value)}
              placeholder="Ej: lavar ropa, planchar, fregar..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPreference('dislikes', dislikesInput)
                  setDislikesInput('')
                }
              }}
            />
            <button type="button"
              onClick={() => { addPreference('dislikes', dislikesInput); setDislikesInput('') }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.taskPreferencesDislikes || []).map((pref: string) => (
              <div key={pref} className="bg-red-100 text-red-800 px-3 py-1 rounded-full flex items-center gap-1.5 text-sm">
                {pref}
                <button onClick={() => removePreference('dislikes', pref)} className="hover:bg-red-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
