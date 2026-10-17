import { useEffect, useState, type ReactNode } from 'react'
import { DEFAULTS, SettingsContext, type Settings } from './settings.ts'
import { useStored } from './storage.ts'

const THEME_COLOR = { light: '#f3f2f2', sepia: '#f3ead6', dark: '#1a1714' }

const darkQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null)

function useSystemDark() {
  const [dark, setDark] = useState(() => !!darkQuery()?.matches)
  useEffect(() => {
    const query = darkQuery()
    if (!query) return
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    query.addEventListener('change', on)
    return () => query.removeEventListener('change', on)
  }, [])
  return dark
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, store] = useStored<Partial<Settings>>('settings', {})
  const settings = { ...DEFAULTS, ...stored }
  const systemDark = useSystemDark()
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && systemDark)
  const page = dark ? 'dark' : settings.theme === 'sepia' ? 'sepia' : 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', page)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[page])
  }, [page])

  const set = (patch: Partial<Settings>) => store({ ...settings, ...patch })
  return <SettingsContext.Provider value={{ settings, set, dark }}>{children}</SettingsContext.Provider>
}

