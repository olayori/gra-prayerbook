import { createContext, useContext } from 'react'
import type { BookConfigJson } from './types.ts'

export type Role = 'editor' | 'admin'
export type AdminBook = { slug: string; title: string; config: BookConfigJson }

export type AdminCtx = {
  me: string
  userId: string
  role: Role
  books: AdminBook[]
  book: AdminBook
  pickBook: (slug: string) => void
  toast: (message: string) => void
  // A tab with unsaved work outside the draft (Weekly, Translations) sets the question to
  // ask before switching tab or book, signing out or closing the page; null when clean.
  holdLeave: (question: string | null) => void
  leaving: () => string | null
}

export const AdminContext = createContext<AdminCtx | null>(null)

export function useAdmin(): AdminCtx {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside the Admin Console')
  return ctx
}
