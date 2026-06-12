// Catálogo estático de ideas de tareas (extraído de pages/Tasks.tsx en T2).
// Es un listado fijo de sugerencias — no se filtra por lo ya añadido (duplicar
// es intencional, ej: "Limpiar baño" con dos baños).

export type CatalogTask = { name: string; pts: number; desc?: string }
export type CatalogGroup = { category: string; tasks: CatalogTask[] }

export const TASK_CATALOG: CatalogGroup[] = [
  { category: 'cocina', tasks: [
    { name: 'Cocinar la cena', pts: 12 }, { name: 'Cocinar la comida', pts: 10 },
    { name: 'Preparar el desayuno', pts: 6 }, { name: 'Fregar los platos', pts: 8 },
    { name: 'Vaciar el lavavajillas', pts: 5 }, { name: 'Limpiar la cocina', pts: 12 },
  ]},
  { category: 'limpieza', tasks: [
    { name: 'Pasar la aspiradora', pts: 10 }, { name: 'Fregar el suelo', pts: 12 },
    { name: 'Limpiar el polvo', pts: 8 }, { name: 'Poner la lavadora', pts: 6 },
    { name: 'Tender la ropa', pts: 6 }, { name: 'Doblar y guardar ropa', pts: 8 }, { name: 'Planchar', pts: 10 },
  ]},
  { category: 'baños', tasks: [
    { name: 'Limpiar baño completo', pts: 15 }, { name: 'Limpiar WC', pts: 8 },
    { name: 'Limpiar lavabos y espejos', pts: 7 },
  ]},
  { category: 'compra', tasks: [
    { name: 'Hacer la compra semanal', pts: 18, desc: 'Supermercado grande' },
    { name: 'Compra pequeña / reposición', pts: 8 }, { name: 'Hacer lista de la compra', pts: 5 },
    { name: 'Recibir pedido online', pts: 5 },
  ]},
  { category: 'logistica', tasks: [
    { name: 'Gestión facturas / banca', pts: 10 }, { name: 'Llamadas y gestiones admin', pts: 8 },
    { name: 'Organizar armarios', pts: 12 }, { name: 'Sacar basura / reciclaje', pts: 5 },
    { name: 'Llevar coche al taller', pts: 10 },
  ]},
  { category: 'cuidado', tasks: [
    { name: 'Llevar/recoger niños al cole', pts: 8 }, { name: 'Ayudar con los deberes', pts: 10 },
    { name: 'Baño / ducha de los niños', pts: 8 }, { name: 'Acostar a los niños', pts: 7 },
    { name: 'Tarde con los niños (actividades)', pts: 15 },
  ]},
  { category: 'mantenimiento', tasks: [
    { name: 'Reparación en casa', pts: 18, desc: 'Bricolaje, fontanería...' },
    { name: 'Gestionar reparación externa', pts: 10 }, { name: 'Organizar trastero/garaje', pts: 14 },
  ]},
  { category: 'jardineria', tasks: [
    { name: 'Regar las plantas', pts: 5 }, { name: 'Cortar el césped', pts: 15 },
    { name: 'Limpiar terraza / balcón', pts: 10 },
  ]},
  { category: 'mascotas', tasks: [
    { name: 'Sacar a pasear al perro', pts: 5 }, { name: 'Dar de comer a la mascota', pts: 4 },
    { name: 'Limpiar zona de la mascota', pts: 8 }, { name: 'Llevar al veterinario', pts: 12 },
  ]},
]
