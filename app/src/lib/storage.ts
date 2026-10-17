import { useCallback, useState } from 'react'

// Device storage. Keys are the live site's own (`gra-covenant-settings`, `gra-jcfp-prayed`, …)
// so people keep their progress when the app replaces the site. Shared keys live under
// the covenant prefix, as in the design (SHARED_KEYS in design/src/book/app.js).
export const SHARED_KEYS = ['member', 'pendingCode', 'settings', 'installSeen', 'uq', 'weekly', 'unlocked']

export const keyFor = (book: string, k: string) => (SHARED_KEYS.includes(k) ? 'gra-covenant-' : `gra-${book}-`) + k

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // private mode or storage full
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function useStored<T>(key: string, fallback: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => load(key, fallback))
  const set = useCallback(
    (next: T) => {
      setValue(next)
      save(key, next)
    },
    [key],
  )
  return [value, set]
}
