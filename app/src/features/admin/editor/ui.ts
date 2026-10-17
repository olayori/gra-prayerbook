import type { DragEvent } from 'react'
import type { Kind, Pos } from './engine.ts'

// Shared by the Content tab's outline, editors and dialogs.
export type Drop = { u: string; pos: Pos } | null
export type DnD = {
  start: (kind: Kind, u: string, e: DragEvent) => void
  over: (kind: Kind, u: string, e: DragEvent) => void
  drop: (kind: Kind, u: string, e: DragEvent) => void
  end: () => void
}
// Highlight for the current drop target: a line before/after, or a box for "into".
export type Look = (u: string) => { line: string; hot: boolean }
export type MoveTarget = { kind: 'section' | 'prayer'; u: string; target: string } | null
export type ScrTarget = { owner: 'f' | 'p'; ownerU: string; idx: number }

// A short quote of a prayer for confirmations and the change log (design: snip).
export const snip = (t: string) => {
  t = (t || '').trim()
  return t.length > 48 ? '“' + t.slice(0, 46).trim() + '…”' : t ? `“${t}”` : 'an empty prayer'
}
