import { useStored } from '../../lib/storage.ts'
import type { BookKey } from './books.ts'

// Per-book progress, in the design's formats: prayed/fav are { id: 1 },
// bookmarks are { id: 'YYYY-MM-DD' }, history is { 'YYYY-MM-DD': [prayer ids] }.
type Flags = Record<string, 1>
type Dated = Record<string, string>
type History = Record<string, string[]>

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function useMarks(book: BookKey) {
  const [prayed, setPrayed] = useStored<Flags>(`${book}:prayed`, {})
  const [fav, setFav] = useStored<Flags>(`${book}:fav`, {})
  const [bm, setBm] = useStored<Dated>(`${book}:bookmarks`, {})
  const [hist, setHist] = useStored<History>(`${book}:hist`, {})

  const savePrayed = (next: Flags) => {
    const added = Object.keys(next).filter((k) => !prayed[k])
    if (added.length) {
      const t = dayKey()
      setHist({ ...hist, [t]: [...new Set([...(hist[t] ?? []), ...added])] })
    }
    setPrayed(next)
  }

  return {
    prayed,
    fav,
    bm,
    hist,
    toggle(id: string) {
      const next = { ...prayed }
      if (next[id]) delete next[id]
      else next[id] = 1
      savePrayed(next)
    },
    setMany(ids: string[], on: boolean) {
      const next = { ...prayed }
      ids.forEach((id) => (on ? (next[id] = 1) : delete next[id]))
      savePrayed(next)
    },
    clearPrefix(prefix: string) {
      savePrayed(Object.fromEntries(Object.entries(prayed).filter(([k]) => !k.startsWith(prefix))) as Flags)
    },
    toggleFav(id: string): boolean {
      const next = { ...fav }
      const on = !next[id]
      if (on) next[id] = 1
      else delete next[id]
      setFav(next)
      return on
    },
    toggleBm(id: string): boolean {
      const next = { ...bm }
      const on = !next[id]
      if (on) next[id] = dayKey()
      else delete next[id]
      setBm(next)
      return on
    },
  }
}

export type Marks = ReturnType<typeof useMarks>
