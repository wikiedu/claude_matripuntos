// Client-side category inference for Shopping items.
// Backend ShoppingItem does NOT have a category field (only {id, listId, text, isChecked, ...}),
// so we infer the category from `item.text` using a Spanish keyword dictionary.

export type ShoppingCategoryKey = 'fresco' | 'despensa' | 'hogar' | 'mascotas' | 'otros'

export const CATEGORIES: Record<ShoppingCategoryKey, { emoji: string; label: string }> = {
  fresco:   { emoji: '🥬', label: 'Fresco' },
  despensa: { emoji: '🥫', label: 'Despensa' },
  hogar:    { emoji: '🧹', label: 'Hogar' },
  mascotas: { emoji: '🐕', label: 'Mascotas' },
  otros:    { emoji: '✨', label: 'Otros' },
}

// Order used when rendering groups (otros always last).
export const CATEGORY_ORDER: ShoppingCategoryKey[] = ['fresco', 'despensa', 'hogar', 'mascotas', 'otros']

const CATEGORY_KEYWORDS: Record<Exclude<ShoppingCategoryKey, 'otros'>, string[]> = {
  fresco: [
    'leche', 'queso', 'yogur', 'yogurt', 'nata', 'mantequilla', 'huevo', 'huevos',
    'pollo', 'pescado', 'carne', 'ternera', 'cerdo', 'jamón', 'jamon', 'embutido',
    'lechuga', 'tomate', 'cebolla', 'ajo', 'patata', 'zanahoria', 'pimiento',
    'fruta', 'manzana', 'plátano', 'platano', 'naranja', 'pera', 'uva', 'fresa',
    'verdura', 'ensalada', 'pan', 'bollería', 'bolleria',
  ],
  despensa: [
    'arroz', 'pasta', 'macarrones', 'espagueti', 'aceite', 'vinagre', 'sal', 'azúcar', 'azucar',
    'harina', 'lentejas', 'garbanzos', 'alubias', 'legumbres', 'conservas', 'atún', 'atun',
    'café', 'cafe', 'té', 'infusión', 'infusion', 'cacao', 'chocolate',
    'cereal', 'cereales', 'galletas', 'tostadas', 'especias', 'caldo', 'salsa',
  ],
  hogar: [
    'papel', 'servilleta', 'detergente', 'suavizante', 'lejía', 'lejia', 'jabón', 'jabon',
    'esponja', 'estropajo', 'bolsa', 'bolsas', 'bombilla', 'pila', 'pilas',
    'limpiador', 'fregasuelos', 'friegasuelos', 'ambientador', 'velas',
    'basura', 'film', 'aluminio', 'rollo',
  ],
  mascotas: [
    'pienso', 'arena', 'snack perro', 'snack gato', 'juguete perro', 'juguete gato',
    'correa', 'champú perro', 'champu perro', 'comida perro', 'comida gato',
    'gato', 'perro', 'hámster', 'hamster', 'pájaro', 'pajaro',
  ],
}

export function inferCategory(text: string): ShoppingCategoryKey {
  const t = text.toLowerCase().trim()
  if (!t) return 'otros'
  for (const cat of CATEGORY_ORDER) {
    if (cat === 'otros') continue
    const kws = CATEGORY_KEYWORDS[cat as Exclude<ShoppingCategoryKey, 'otros'>]
    if (kws.some(k => t.includes(k))) return cat
  }
  return 'otros'
}
