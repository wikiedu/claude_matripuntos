import { Users, X } from 'lucide-react'
import { useState } from 'react'

interface Step3Props {
  data: any
  onChange: (data: any, nextStep?: number) => void
}

export default function OnboardingStep3({ data, onChange }: Step3Props) {
  const [showChildForm, setShowChildForm] = useState(false)
  const [childForm, setChildForm] = useState({
    name: '',
    dateOfBirth: '',
    livesWithUser1: true,
    livesWithUser2: true,
  })

  const [showPetForm, setShowPetForm] = useState(false)
  const [petForm, setPetForm] = useState({
    name: '',
    type: 'gato',
    quantity: 1,
  })

  const addChild = () => {
    if (!childForm.name || !childForm.dateOfBirth) {
      alert('Por favor completa nombre y fecha de nacimiento')
      return
    }

    const children = data.children || []
    onChange({
      children: [...children, childForm],
    })

    setChildForm({
      name: '',
      dateOfBirth: '',
      livesWithUser1: true,
      livesWithUser2: true,
    })
    setShowChildForm(false)
  }

  const removeChild = (index: number) => {
    const children = data.children || []
    onChange({
      children: children.filter((_: any, i: number) => i !== index),
    })
  }

  const addPet = () => {
    if (!petForm.name) {
      alert('Por favor completa el nombre de la mascota')
      return
    }

    const pets = data.pets || []
    onChange({
      pets: [...pets, petForm],
    })

    setPetForm({
      name: '',
      type: 'gato',
      quantity: 1,
    })
    setShowPetForm(false)
  }

  const removePet = (index: number) => {
    const pets = data.pets || []
    onChange({
      pets: pets.filter((_: any, i: number) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Familia
        </h2>
        <p className="text-gray-600">Cuéntanos sobre los hijos y mascotas (opcional)</p>
      </div>

      {/* Children section */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👧👦 Hijos</h3>

        {data.children && data.children.length > 0 ? (
          <div className="space-y-3 mb-4">
            {data.children.map((child: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{child.name}</p>
                  <p className="text-sm text-gray-600">
                    Nació: {new Date(child.dateOfBirth).toLocaleDateString('es-ES')}
                  </p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                    {child.livesWithUser1 && <span>👤 Usuario 1</span>}
                    {child.livesWithUser2 && <span>👤 Usuario 2</span>}
                  </div>
                </div>
                <button
                  onClick={() => removeChild(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {showChildForm ? (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="text"
              placeholder="Nombre del hijo/a"
              value={childForm.name}
              onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />

            <input
              type="date"
              value={childForm.dateOfBirth}
              onChange={(e) => setChildForm({ ...childForm, dateOfBirth: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">¿Vive con?</p>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={childForm.livesWithUser1}
                  onChange={(e) => setChildForm({ ...childForm, livesWithUser1: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-gray-700">Usuario 1</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={childForm.livesWithUser2}
                  onChange={(e) => setChildForm({ ...childForm, livesWithUser2: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-gray-700">Usuario 2</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={addChild}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Agregar
              </button>
              <button
                onClick={() => setShowChildForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowChildForm(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors font-medium"
          >
            + Agregar hijo/a
          </button>
        )}
      </div>

      {/* Pets section */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🐕 🐈 Mascotas</h3>

        {data.pets && data.pets.length > 0 ? (
          <div className="space-y-3 mb-4">
            {data.pets.map((pet: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{pet.name}</p>
                  <p className="text-sm text-gray-600">
                    {pet.type === 'perro' && 'Perro'}
                    {pet.type === 'gato' && 'Gato'}
                    {pet.type === 'otro' && 'Otro'}
                    {pet.quantity > 1 && ` (${pet.quantity})`}
                  </p>
                </div>
                <button
                  onClick={() => removePet(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {showPetForm ? (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="text"
              placeholder="Nombre de la mascota"
              value={petForm.name}
              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />

            <select
              value={petForm.type}
              onChange={(e) => setPetForm({ ...petForm, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="otro">Otro</option>
            </select>

            <div>
              <label className="text-sm font-medium text-gray-700">Cantidad</label>
              <input
                type="number"
                value={petForm.quantity}
                onChange={(e) => setPetForm({ ...petForm, quantity: parseInt(e.target.value) })}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={addPet}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Agregar
              </button>
              <button
                onClick={() => setShowPetForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPetForm(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors font-medium"
          >
            + Agregar mascota
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 Esto nos ayuda a calcular los puntos de actividades con hijos a cargo. Puedes dejar esto vacío si prefieres.
        </p>
      </div>
    </div>
  )
}
