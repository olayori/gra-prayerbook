import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { auth, AuthContext } from './auth.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(auth.subscribe, auth.getState)
  useEffect(() => auth.start(), [])
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
