import { createContext, useContext } from 'react'
import type { DraftStore } from './draftStore.ts'

// Shared by the console header (save state, undo, Publish), the Content tab and History.
export type Sel = { kind: 'part' | 'section'; u: string } | null
export type EditorCtx = {
  store: DraftStore
  sel: Sel
  setSel: (s: Sel) => void
  open: Record<string, boolean>
  setOpen: (o: Record<string, boolean>) => void
  focusPrayer: (u: string) => void // focus a prayer's textarea once it renders
  takeFocus: () => string | null
}

export const EditorContext = createContext<EditorCtx | null>(null)
export function useEditor(): EditorCtx {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside the Admin Console')
  return ctx
}
