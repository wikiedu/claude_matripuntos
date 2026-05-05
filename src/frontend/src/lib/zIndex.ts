// v2.6.2 audit 06 S1-17 — Tabla canónica de niveles z-index.
//
// Antes había z-40, z-50, z-[58], z-[59] sembrados sin documentar quién
// tapa a quién. Aquí los centralizamos por capas semánticas. Si alguien
// añade un nuevo overlay, debe consultar/extender esta tabla — no
// inventar un valor nuevo en JSX.
//
// Capas (de atrás a delante):
//
//   base                 0    contenido normal
//   sticky-header       40    header pegado, BottomNav, banners de cookie
//   sheet-modal         50    BottomSheet, ConfirmDialog, AlertDialog, MoodSelectorSheet,
//                              wizards (DeleteAccount, LeaveCouple), AddActivitySheet,
//                              AddTaskFromCatalogSheet, ActivityCatalogPicker overlay,
//                              AddActivityTemplateSheet, ProposeChangeDialog
//   header-menu         58/59 dropdown del menú del header (encima de sticky-header
//                              pero típicamente coexiste con sheets, no se suelen apilar)
//   toast/burst         70    PointsBurst, Toasts no-modales (no bloquean interacción)
//   level-up           120    LevelUpModal — encima de todo lo demás (celebración)
//
// Uso: `className={`fixed inset-0 ${Z.SHEET}`}` con `import { Z } from '...'`.
//
export const Z = {
  STICKY_HEADER: 'z-40',
  SHEET: 'z-50',
  HEADER_MENU_BACKDROP: 'z-[58]',
  HEADER_MENU: 'z-[59]',
  TOAST: 'z-[70]',
  LEVEL_UP: 'z-[120]',
} as const

export type ZLevel = keyof typeof Z
