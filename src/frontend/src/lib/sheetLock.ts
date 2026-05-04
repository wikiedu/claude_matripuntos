// v2.3.2 — Lock global para que el polling automático (loadUserData cada 60s,
// react-query refetchInterval, etc.) no interrumpa al usuario cuando hay un
// sheet/modal/wizard abierto. Si el contador es > 0, los pollings deberían
// saltar este tick.
//
// Uso:
//   useEffect(() => {
//     if (!open) return
//     acquireSheetLock()
//     return () => releaseSheetLock()
//   }, [open])
//
// Y donde se hace polling:
//   if (isSheetOpen()) return  // saltar tick

let count = 0
const subscribers = new Set<() => void>()

export function acquireSheetLock() {
  count++
  subscribers.forEach((s) => s())
}

export function releaseSheetLock() {
  count = Math.max(0, count - 1)
  subscribers.forEach((s) => s())
}

export function isSheetOpen(): boolean {
  return count > 0
}

/** Suscríbete a cambios del lock. Devuelve unsub. */
export function subscribeSheetLock(fn: () => void): () => void {
  subscribers.add(fn)
  return () => { subscribers.delete(fn) }
}
