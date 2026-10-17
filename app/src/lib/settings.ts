import { createContext, useContext } from 'react'

// Reader settings, shared by every book (the design's "Aa" sheet).
export type Theme = 'light' | 'sepia' | 'dark' | 'auto'

export type Settings = {
  size: number
  lh: number
  font: 'book' | 'clean' | 'easy'
  ls: 'normal' | 'wide'
  theme: Theme
  lastLight: 'light' | 'sepia'
  verses: boolean
}

export const DEFAULTS: Settings = { size: 17, lh: 1.6, font: 'book', ls: 'normal', theme: 'auto', lastLight: 'light', verses: true }

export const FONTS: Record<Settings['font'], string> = {
  book: 'var(--font-body)',
  clean: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  easy: '"Atkinson Hyperlegible", system-ui, sans-serif',
}

export type Ctx = { settings: Settings; set: (patch: Partial<Settings>) => void; dark: boolean }
export const SettingsContext = createContext<Ctx | null>(null)

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
