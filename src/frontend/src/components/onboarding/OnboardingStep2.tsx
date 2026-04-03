import { Home, MapPin } from 'lucide-react'

interface Step2Props {
  data: any
  onChange: (data: any, nextStep?: number) => void
}

export default function OnboardingStep2({ data, onChange }: Step2Props) {
  const handleChange = (field: string, value: any) => {
    onChange({ [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Home className="w-6 h-6 text-primary" />
          Tu Hogar
        </h2>
        <p className="text-gray-600">Cuéntanos sobre la vivienda donde vivís juntos</p>
      </div>

      {/* Home type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de vivienda</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'piso', label: '🏢 Piso' },
            { value: 'casa', label: '🏠 Casa' },
            { value: 'otro', label: 'Otro' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleChange('homeType', option.value)}
              className={`p-4 border-2 rounded-lg font-medium transition-all ${
                data.homeType === option.value
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Home size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Tamaño aproximado (m²)
        </label>
        <input
          type="number"
          value={data.homeSizeM2 || ''}
          onChange={(e) => handleChange('homeSizeM2', e.target.value ? parseInt(e.target.value) : '')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Ej: 85"
          min="10"
        />
        <p className="text-xs text-gray-500 mt-1">Esto nos ayuda a ajustar los cálculos de distribución</p>
      </div>

      {/* Living arrangement */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Convivencia</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="cohabitation"
              value="together"
              checked={data.cohabitationStyle === 'together' || !data.cohabitationStyle}
              onChange={() => handleChange('cohabitationStyle', 'together')}
              className="w-4 h-4 text-primary"
            />
            <div>
              <p className="font-medium text-gray-900">Siempre juntos</p>
              <p className="text-sm text-gray-500">Vivimos juntos la mayor parte del tiempo</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="cohabitation"
              value="sometimes"
              checked={data.cohabitationStyle === 'sometimes'}
              onChange={() => handleChange('cohabitationStyle', 'sometimes')}
              className="w-4 h-4 text-primary"
            />
            <div>
              <p className="font-medium text-gray-900">A veces separados</p>
              <p className="text-sm text-gray-500">Tenemos períodos sin vivir juntos</p>
            </div>
          </label>
        </div>

        {data.cohabitationStyle === 'sometimes' && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="Ej: L-V en casa, fines de semana separados"
              value={data.cohabitationSchedule || ''}
              onChange={(e) => handleChange('cohabitationSchedule', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* External services */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Servicios Externos</h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={data.hasCleaner || false}
              onChange={(e) => handleChange('hasCleaner', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="font-medium text-gray-700">Tenemos limpiadora/servicio de limpieza</span>
          </label>

          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={data.hasBabysitter || false}
              onChange={(e) => handleChange('hasBabysitter', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="font-medium text-gray-700">Tenemos niñera/cuidadora</span>
          </label>

          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={data.hasGardener || false}
              onChange={(e) => handleChange('hasGardener', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="font-medium text-gray-700">Tenemos jardinero/servicio de jardín</span>
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 Esto nos ayuda a calcular puntos de manera más justa. Si tienen ayuda externa, los puntos de tareas domésticas se ajustarán.
        </p>
      </div>
    </div>
  )
}
