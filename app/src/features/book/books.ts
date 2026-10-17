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
  table: 'book_state' | 'library_state' // where synced progress lives
  verTable: 'book_versions' | 'lib_versions' // versions published from the Admin Console
  usage: boolean // counts prayers/opens for the admin insights
  access: 'free' | 'members' // TODO(catalog phase 3): from get_book()
}

export const BOOKS: Record<BookKey, BookConfig> = {
  covenant: {
    key: 'covenant', title: 'Book of Covenant Prayers', secWord: 'Section', itemsLabel: 'Prayers', url: covenantUrl,
    table: 'book_state', verTable: 'book_versions', usage: true, access: 'members',
  },
  jcfp: {
    key: 'jcfp', title: 'Jesus Chosen Fast and Prayer Prayer Manual', secWord: 'Section', itemsLabel: 'Prayer', url: jcfpUrl,
    table: 'library_state', verTable: 'lib_versions', usage: false, access: 'free',
  },
}

export const isBookKey = (k: string | undefined): k is BookKey => k === 'covenant' || k === 'jcfp'

// The bundled edition ships with the app (works offline and in the native builds); newer
// editions published from the Admin Console are applied by BookStore.
// TODO(entitlements): paid books will load from Supabase for entitled users instead.
export async function loadBook(key: BookKey): Promise<Part[]> {
  const res = await fetch(BOOKS[key].url)
  if (!res.ok) throw new Error(`Could not load ${key}: HTTP ${res.status}`)
  return res.json()
}
