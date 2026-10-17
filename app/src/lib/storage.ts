import { useCallback, useState } from 'react'

// Device storage for the app. Keys are namespaced apart from the live site's `gra-*`
// keys: the web preview shares an origin with it, and the two must not overwrite
// each other's progress before account sync is ported.
const NS = 'overcomers:'

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(NS + key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    if (value == null) localStorage.removeItem(NS + key)
    else localStorage.setItem(NS + key, JSON.stringify(value))
    return true
  } catch {
    return false // private mode or storage full
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
