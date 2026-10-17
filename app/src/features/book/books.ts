import covenantUrl from '../../../../site/prayers.json?url'
import jcfpUrl from '../../../../site/jcfp.json?url'
import type { Part } from './types.ts'

// Mirrors BOOKS in design/src/book/app.js. Weekly lives in features/weekly.
export type BookKey = 'covenant' | 'jcfp'

export type BookConfig = {
  key: BookKey
  title: string
  secWord: string
  itemsLabel: string
  url: string
}

export const BOOKS: Record<BookKey, BookConfig> = {
  covenant: { key: 'covenant', title: 'Book of Covenant Prayers', secWord: 'Section', itemsLabel: 'Prayers', url: covenantUrl },
  jcfp: { key: 'jcfp', title: 'Jesus Chosen Fast and Prayer Prayer Manual', secWord: 'Section', itemsLabel: 'Prayer', url: jcfpUrl },
}

export const isBookKey = (k: string | undefined): k is BookKey => k === 'covenant' || k === 'jcfp'

// Content ships with the app (works offline and in the native builds).
// TODO(entitlements): paid books will load from Supabase for entitled users instead.
export async function loadBook(key: BookKey): Promise<Part[]> {
  const res = await fetch(BOOKS[key].url)
  if (!res.ok) throw new Error(`Could not load ${key}: HTTP ${res.status}`)
  return res.json()
}
