const listeners = new Set<() => void>()
export function onDirectoryInvalidation(listener: () => void) { listeners.add(listener) }
export function invalidateDirectory() { for (const listener of listeners) listener() }
