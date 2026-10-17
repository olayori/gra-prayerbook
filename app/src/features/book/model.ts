import type { BookConfig } from './books.ts'
import type { Part, Scripture } from './types.ts'

// View model for the reader, ported from renderVals() in design/src/book/app.js.
// Ids match the design's so saved progress can be synced with the web app later:
// part `part-<n>`, section `s-<part>-<section>`, prayer `s-<part>-<section>-<prayer>`.

export type Marks = Record<string, unknown> // id → truthy when set

export type PrayerView = {
  id: string
  n: number
  text: string
  scripture: Scripture[]
  showScripture: boolean // verses inline under the prayer
  refChips: Scripture[] // verses hidden: tappable references instead
  checked: boolean
  fav: boolean
}

export type SectionView = {
  id: string
  num: string
  tocNum: string
  kicker: string
  title: string
  showHdr: boolean
  showTitle: boolean
  showItemsLabel: boolean
  showOrn: boolean
  compact: boolean // JCFP prayer sections run on without their own header block
  isList: boolean
  list: { name: string; sub: string; group: string; groupStart: boolean }[]
  itemsLabel: string
  foundation: Scripture[]
  prayers: PrayerView[]
  ids: string[]
  done: number
  total: number
  tocCount: number
  progress: string
  bookmarked: boolean
}

export type PartView = {
  id: string
  n: number
  label: string
  title: string
  titleCase: string
  subtitle: string
  showNum: boolean
  count: string
  sections: SectionView[]
  ids: string[]
  done: number
  total: number
  hasActions: boolean // JCFP watches have part-level actions
  bookmarked: boolean
  weeklyAfter: boolean // JCFP: the weekly prayers section follows this part
}

export type BookView = { parts: PartView[]; done: number; total: number; stats: string }

const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']

// The design's version consumed the trailing space, so back-to-back small words
// ("for The Church") kept a capital; the lookahead fixes that.
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s(—-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase())
    .replace(/ (And|Of|The|In|For|To)(?= )/g, (_, w: string) => ' ' + w.toLowerCase())
    .replace(/Gra\b/g, 'GRA')
    .replace(/God'S/g, "God's")
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function buildBook(
  book: BookConfig,
  data: Part[],
  marks: { prayed: Marks; fav: Marks; bm: Marks },
  showVerses: boolean,
): BookView {
  const J = book.key === 'jcfp'
  const weeklyPart = J ? data.reduce((a, p, i) => (p.sections.some((s) => s.kind !== 'list') ? i : a), -1) : -1
  let done = 0
  let total = 0

  const parts = data.map((p, pi): PartView => {
    const n = pi + 1
    let run = 0
    const sections = p.sections.flatMap((s, si): SectionView[] => {
      if (J && s.prayers.some((x) => x.link === 'weekly')) return []
      const id = `s-${n}-${si + 1}`
      const num = `${n}.${si + 1}`
      const runStart = run + 1
      const isList = s.kind === 'list'
      const prayers = s.prayers.map((pr, i): PrayerView => {
        const pid = `${id}-${i + 1}`
        const hasVerses = pr.scripture.some((sc) => sc.verses?.length)
        return {
          id: pid,
          n: J ? ++run : i + 1,
          text: pr.text,
          scripture: pr.scripture,
          showScripture: pr.scripture.length > 0 && (showVerses || !hasVerses),
          refChips: !showVerses && hasVerses ? pr.scripture : [],
          checked: !!marks.prayed[pid],
          fav: !!marks.fav[pid],
        }
      })
      const sDone = prayers.filter((x) => x.checked).length
      const list = (s.list ?? []).map((it, k, a) => ({
        name: it.name,
        sub: it.sub ?? '',
        group: it.group ?? '',
        groupStart: !!it.group && (k === 0 || a[k - 1].group !== it.group),
      }))
      return [
        {
          id,
          num,
          tocNum: J ? (isList ? '' : String(runStart)) : num,
          kicker: J && isList ? 'Prayer List' : `${book.secWord} ${num}`,
          title: s.title,
          showHdr: !J || isList,
          showTitle: !isList && !s.hideTitle,
          showItemsLabel: !J,
          showOrn: !J || isList,
          compact: J && !isList,
          isList,
          list,
          itemsLabel: s.itemsLabel ?? book.itemsLabel,
          foundation: s.foundation,
          prayers,
          ids: prayers.map((x) => x.id),
          done: sDone,
          total: prayers.length,
          tocCount: isList ? list.length : prayers.length,
          progress: isList
            ? `${list.length} names`
            : sDone
              ? `${sDone} of ${prayers.length} prayed`
              : plural(prayers.length, 'prayer', 'prayers'),
          bookmarked: !!marks.bm[id],
        },
      ]
    })

    const prayerSecs = sections.filter((s) => !s.isList)
    const pTotal = sections.reduce((a, s) => a + s.total, 0)
    const pDone = sections.reduce((a, s) => a + s.done, 0)
    done += pDone
    total += pTotal
    const allLists = sections.length > 0 && sections.every((s) => s.isList)
    const names = sections.reduce((a, s) => a + s.list.length, 0)
    return {
      id: `part-${n}`,
      n,
      label: book.key !== 'covenant' && p.label ? p.label : `Part ${WORDS[pi]}`,
      title: p.title,
      titleCase: titleCase(p.title),
      subtitle: p.subtitle,
      showNum: !allLists,
      count: allLists
        ? `${plural(sections.length, 'list', 'lists')} · ${names} names`
        : J
          ? `${pTotal} prayers`
          : `${plural(sections.length, 'section', 'sections')} · ${pTotal} prayers`,
      sections,
      ids: prayerSecs.flatMap((s) => s.ids),
      done: pDone,
      total: pTotal,
      hasActions: J && !allLists && prayerSecs.length > 0,
      bookmarked: !!marks.bm[`part-${n}`],
      weeklyAfter: pi === weeklyPart,
    }
  })

  return { parts, done, total, stats: bookStats(book, data) }
}

// Subtitle on the title page, e.g. "9 parts · 61 sections · 869 prayers".
export function bookStats(book: BookConfig, data: Part[]): string {
  if (book.key === 'jcfp') {
    const isLists = (p: Part) => /LISTS/.test(p.title)
    const lists = data.filter(isLists).reduce((a, p) => a + p.sections.length, 0)
    const watches = data.filter((p) => !isLists(p))
    const prayers = watches.reduce(
      (a, p) => a + p.sections.filter((s) => !s.prayers.some((y) => y.link === 'weekly')).reduce((b, s) => b + s.prayers.length, 0),
      0,
    )
    return `${watches.length} prayer watches · ${prayers} prayers · ${lists} lists`
  }
  const nS = data.reduce((a, p) => a + p.sections.length, 0)
  const nP = data.reduce((a, p) => a + p.sections.reduce((b, s) => b + s.prayers.length, 0), 0)
  return `${data.length} parts · ${nS} sections · ${nP} prayers`
}

// Circumference-based dash for the 18px progress ring (r=7), as in the design.
const C = 43.98
export const ringDash = (f: number) => `${(f * C).toFixed(2)} ${C}`
