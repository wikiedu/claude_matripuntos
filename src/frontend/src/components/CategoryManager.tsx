import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, AlertCircle } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface Category {
  id: string
  name: string
  emoji: string
  type: 'event' | 'chore' | 'service'
  basePoints: number
  description?: string
  isCustom: boolean
  isActive: boolean
  subcategories: Array<{
    id: string
    name: string
    basePointsModifier: number
  }>
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const [newCategory, setNewCategory] = useState({
    name: '',
    emoji: '',
    type: 'event' as const,
    basePoints: 10,
    description: '',
  })

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.categories.getAll()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.emoji) {
      alert('Por favor completa nombre y emoji')
      return
    }

    try {
      await apiClient.categories.create(newCategory)
      setNewCategory({
        name: '',
        emoji: '',
        type: 'event',
        basePoints: 10,
        description: '',
      })
      setShowNewForm(false)
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      return
    }

    try {
      await apiClient.categories.delete(categoryId)
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  const groupedByType = categories.reduce(
    (acc, cat) => {
      if (!acc[cat.type]) acc[cat.type] = []
      acc[cat.type].push(cat)
      return acc
    },
    {} as Record<string, Category[]>
  )

  const typeLabels = {
    event: { label: '🎉 Eventos', color: 'blue' },
    chore: { label: '🏠 Tareas del Hogar', color: 'green' },
    service: { label: '🔧 Servicios', color: 'purple' },
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando categorías...</div>
      ) : (
        <>
          {/* Create new category button */}
          <div>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Crear Categoría Custom
            </button>
          </div>

          {/* New category form */}
          {showNewForm && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: Mi categoría"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Emoji</label>
                  <input
                    type="text"
                    value={newCategory.emoji}
                    onChange={(e) => setNewCategory({ ...newCategory, emoji: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="🎯"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
                  <select
                    value={newCategory.type}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, type: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="event">Evento</option>
                    <option value="chore">Tarea</option>
                    <option value="service">Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Puntos Base
                  </label>
                  <input
                    type="number"
                    value={newCategory.basePoints}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, basePoints: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Descripción</label>
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Opcional"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateCategory}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                >
                  Crear
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Categories by type */}
          <div className="space-y-6">
            {Object.entries(typeLabels).map(([type, { label }]) => (
              <div key={type}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{label}</h3>
                <div className="space-y-2">
                  {(groupedByType[type as keyof typeof typeLabels] || []).map((category) => (
                    <div key={category.id} className="border border-gray-200 rounded-lg">
                      {/* Category header */}
                      <button
                        onClick={() =>
                          setExpandedCategory(
                            expandedCategory === category.id ? null : category.id
                          )
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <span className="text-2xl">{category.emoji}</span>
                          <div>
                            <p className="font-medium text-gray-900">{category.name}</p>
                            <p className="text-sm text-gray-600">{category.basePoints} pts base</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {category.isCustom && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCategory(category.id)
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <ChevronDown
                            className={`w-5 h-5 text-gray-500 transition-transform ${
                              expandedCategory === category.id ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Expanded content */}
                      {expandedCategory === category.id && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                          {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                          )}

                          {category.subcategories.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Subcategorías:
                              </p>
                              <div className="space-y-1">
                                {category.subcategories.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="flex justify-between items-center text-sm text-gray-600 bg-white p-2 rounded"
                                  >
                                    <span>{sub.name}</span>
                                    <span className="font-medium">
                                      {sub.basePointsModifier > 0 ? '+' : ''}
                                      {sub.basePointsModifier}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!category.isCustom && (
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                              📌 Categoría base (no editable)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Points info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-blue-900">💡 Sobre los Puntos:</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Los puntos base se multiplican por 15+ factores (hora, día, hijos, etc)</li>
          <li>• Máximo 500 puntos por evento</li>
          <li>• Solo puedes agregar nuevas categorías, no modificar las base</li>
          <li>• Las subcategorías ajustan el valor base</li>
        </ul>
      </div>
    </div>
  )
}
