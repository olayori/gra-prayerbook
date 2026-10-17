import type { Part, Scripture } from '../../book/types.ts'

// The book editor's rules, ported from the old Admin Console (design/src/admin/app.js:
// ensureU, mut/undo/redo, moveNode, addPrayerAt/addSection/addPart, diff, problems,
// clean). Every edit returns a new draft and never changes the one it was given.

export type EPrayer = { u: string; text: string; scripture: Scripture[]; [k: string]: unknown }
export type ESection = { u: string; title: string; foundation: Scripture[]; prayers: EPrayer[]; kind?: string; [k: string]: unknown }
export type EPart = { u: string; title: string; subtitle: string; label?: string; sections: ESection[]; [k: string]: unknown }
export type Draft = EPart[]
export type Kind = 'part' | 'section' | 'prayer'
export type Pos = 'before' | 'after' | 'into'
export type LogEntry = { t: number; by: string; what: string; key: string | null }
export type DiffStats = { pAdd: number; pDel: number; pEdit: number; pMove: number; sAdd: number; sDel: number; sEdit: number; partAdd: number; partDel: number; partEdit: number }
export type Problem = { label: string; sel: { kind: 'part' | 'section'; u: string }; fu?: string }

const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen']
export const partLabel = (i: number) => `Part ${WORDS[i] || i + 1}`

export function titleCase(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/(^|[\s\-‘“(])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase())
    .replace(/\b(Of|The|And|In|On|For|To|A|An|By|Over|With|At|From)\b/g, (m: string, _w: string, i: number) => (i === 0 ? m : m.toLowerCase()))
    .replace(/^./, (c) => c.toUpperCase())
}

export const newId = (prefix: 'p' | 's' | 'pt') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

// Fill in ids and defaults (design: ensureU). Ids match the reader's s-<p>-<s>-<n>.
export function ensureU(data: Part[]): Draft {
  const d = clone(data) as unknown as Draft
  d.forEach((p, pi) => {
    p.u = p.u || `part-${pi + 1}`
    p.subtitle = p.subtitle || ''
    p.sections.forEach((s, si) => {
      s.u = s.u || `s-${pi + 1}-${si + 1}`
      s.foundation = s.foundation || []
      s.prayers = s.prayers || []
      s.prayers.forEach((pr, i) => {
        pr.u = pr.u || `s-${pi + 1}-${si + 1}-${i + 1}`
        pr.scripture = pr.scripture || []
      })
    })
  })
  return d
}

// ---- locating things ----
export function locPart(d: Draft, u: string) {
  const pi = d.findIndex((p) => p.u === u)
  return pi < 0 ? null : { pi, p: d[pi] }
}
export function locSection(d: Draft, u: string) {
  for (let pi = 0; pi < d.length; pi++) {
    const si = d[pi].sections.findIndex((s) => s.u === u)
    if (si >= 0) return { pi, si, p: d[pi], s: d[pi].sections[si] }
  }
  return null
}
export function locPrayer(d: Draft, u: string) {
  for (let pi = 0; pi < d.length; pi++)
    for (let si = 0; si < d[pi].sections.length; si++) {
      const s = d[pi].sections[si], i = s.prayers.findIndex((x) => x.u === u)
      if (i >= 0) return { pi, si, i, s, pr: s.prayers[i] }
    }
  return null
}

// Apply a change to a copy.
function edit(d: Draft, fn: (c: Draft) => void): Draft {
  const c = clone(d)
  fn(c)
  return c
}

// ---- edits ----
export const setPartTitle = (d: Draft, u: string, v: string) => edit(d, (c) => void (locPart(c, u)!.p.title = v))
export const setPartSubtitle = (d: Draft, u: string, v: string) => edit(d, (c) => void (locPart(c, u)!.p.subtitle = v))
export const setSectionTitle = (d: Draft, u: string, v: string) => edit(d, (c) => void (locSection(c, u)!.s.title = v))
export const setPrayerText = (d: Draft, u: string, v: string) => edit(d, (c) => void (locPrayer(c, u)!.pr.text = v))

export const addPart = (d: Draft, u: string) => edit(d, (c) => void c.push({ u, title: 'NEW PART', subtitle: '', sections: [] }))
export const addSection = (d: Draft, pu: string, u: string, firstPrayerU: string) =>
  edit(d, (c) => void locPart(c, pu)!.p.sections.push({ u, title: 'New section', foundation: [], prayers: [{ u: firstPrayerU, text: '', scripture: [] }] }))
export const addPrayer = (d: Draft, su: string, u: string, at?: number) =>
  edit(d, (c) => {
    const s = locSection(c, su)!.s
    s.prayers.splice(at == null ? s.prayers.length : at, 0, { u, text: '', scripture: [] })
  })

export const deletePart = (d: Draft, u: string) => edit(d, (c) => void c.splice(locPart(c, u)!.pi, 1))
export const deleteSection = (d: Draft, u: string) =>
  edit(d, (c) => {
    const L = locSection(c, u)!
    L.p.sections.splice(L.si, 1)
  })
export const deletePrayer = (d: Draft, u: string) =>
  edit(d, (c) => {
    const L = locPrayer(c, u)!
    L.s.prayers.splice(L.i, 1)
  })

export const swapPrayer = (d: Draft, u: string, dir: -1 | 1) =>
  edit(d, (c) => {
    const A = locPrayer(c, u)!, j = A.i + dir
    if (j < 0 || j >= A.s.prayers.length) return
    ;[A.s.prayers[A.i], A.s.prayers[j]] = [A.s.prayers[j], A.s.prayers[A.i]]
  })

// Drag and drop / "Move" dialog (design: moveNode). 'into' appends a prayer to a section
// or a section to a part.
export function move(d: Draft, kind: Kind, u: string, targetU: string, pos: Pos): Draft {
  return edit(d, (c) => {
    if (kind === 'part') {
      const [x] = c.splice(locPart(c, u)!.pi, 1)
      let j = c.findIndex((p) => p.u === targetU)
      if (pos === 'after') j++
      c.splice(j, 0, x)
    } else if (kind === 'section') {
      const A = locSection(c, u)!
      const [x] = A.p.sections.splice(A.si, 1)
      if (pos === 'into') locPart(c, targetU)!.p.sections.push(x)
      else {
        const B = locSection(c, targetU)!
        B.p.sections.splice(B.si + (pos === 'after' ? 1 : 0), 0, x)
      }
    } else {
      const A = locPrayer(c, u)!
      const [x] = A.s.prayers.splice(A.i, 1)
      if (pos === 'into') locSection(c, targetU)!.s.prayers.push(x)
      else {
        const B = locPrayer(c, targetU)!
        B.s.prayers.splice(B.i + (pos === 'after' ? 1 : 0), 0, x)
      }
    }
  })
}

// Scripture on a section's foundation ('f') or a prayer ('p'). idx -1 adds; value null removes.
export function setScripture(d: Draft, owner: 'f' | 'p', ownerU: string, idx: number, value: Scripture | null): Draft {
  return edit(d, (c) => {
    const list = owner === 'f' ? locSection(c, ownerU)!.s.foundation : locPrayer(c, ownerU)!.pr.scripture
    if (value === null) list.splice(idx, 1)
    else if (idx < 0) list.push(value)
    else list[idx] = value
  })
}

// ---- undo / redo (design: mut, undo, redo) ----
// Edits to the same field within 4 seconds are one undo step; 80 steps are kept.
export class History {
  private undoS: string[] = []
  private redoS: string[] = []
  private lastKey: string | undefined
  private lastT = 0

  push(prev: Draft, key?: string, now = Date.now()) {
    if (!(key && this.lastKey === key && now - this.lastT < 4000)) {
      this.undoS.push(JSON.stringify(prev))
      if (this.undoS.length > 80) this.undoS.shift()
      this.redoS = []
    }
    this.lastKey = key
    this.lastT = now
  }
  // Before replacing the whole draft (undo/redo/restore/discard): never joins.
  breakChain() {
    this.lastKey = undefined
  }
  undo(cur: Draft): Draft | null {
    const prev = this.undoS.pop()
    if (!prev) return null
    this.redoS.push(JSON.stringify(cur))
    this.breakChain()
    return JSON.parse(prev)
  }
  redo(cur: Draft): Draft | null {
    const next = this.redoS.pop()
    if (!next) return null
    this.undoS.push(JSON.stringify(cur))
    this.breakChain()
    return JSON.parse(next)
  }
  clear() {
    this.undoS = []
    this.redoS = []
  }
  get canUndo() {
    return this.undoS.length > 0
  }
  get canRedo() {
    return this.redoS.length > 0
  }
}

// The draft's change log: repeated edits to the same thing within 5 minutes are one entry.
export function logChange(log: LogEntry[], e: { what: string; key?: string | null; by: string }, now = Date.now()): LogEntry[] {
  const last = log[log.length - 1]
  if (e.key && last && last.key === e.key && now - last.t < 300000) return [...log.slice(0, -1), { ...last, t: now }]
  return [...log, { t: now, by: e.by, what: e.what, key: e.key || null }]
}

// ---- what changed since the published version (design: diff) ----
export function diff(pub: Draft, d: Draft): { st: DiffStats; total: number; flag: Record<string, 'New' | 'Edited' | 'Moved'>; secFlag: Record<string, boolean> } {
  const pubP: Record<string, { text: string; scr: string; su: string }> = {}
  const pubS: Record<string, { title: string; f: string; pu: string }> = {}
  const pubPart: Record<string, { title: string; subtitle: string; pos: number }> = {}
  pub.forEach((p, pi) => {
    pubPart[p.u] = { title: p.title, subtitle: p.subtitle || '', pos: pi }
    p.sections.forEach((s) => {
      pubS[s.u] = { title: s.title, f: JSON.stringify(s.foundation), pu: p.u }
      s.prayers.forEach((pr) => (pubP[pr.u] = { text: pr.text, scr: JSON.stringify(pr.scripture), su: s.u }))
    })
  })
  const st: DiffStats = { pAdd: 0, pDel: 0, pEdit: 0, pMove: 0, sAdd: 0, sDel: 0, sEdit: 0, partAdd: 0, partDel: 0, partEdit: 0 }
  const seenP: Record<string, 1> = {}, seenS: Record<string, 1> = {}, seenPart: Record<string, 1> = {}
  const flag: Record<string, 'New' | 'Edited' | 'Moved'> = {}, secFlag: Record<string, boolean> = {}
  const inDraft: Record<string, string> = {}
  d.forEach((p) => p.sections.forEach((s) => s.prayers.forEach((pr) => (inDraft[pr.u] = s.u))))
  const lostFrom: Record<string, boolean> = {}
  Object.entries(pubP).forEach(([u, x]) => {
    if (inDraft[u] !== x.su) lostFrom[x.su] = true
  })
  d.forEach((p, pi) => {
    seenPart[p.u] = 1
    const pp = pubPart[p.u]
    if (!pp) st.partAdd++
    else if (pp.title !== p.title || pp.subtitle !== (p.subtitle || '') || pp.pos !== pi) st.partEdit++
    p.sections.forEach((s) => {
      seenS[s.u] = 1
      const ps = pubS[s.u]
      let ch = false
      if (!ps) {
        st.sAdd++
        ch = true
      } else if (ps.title !== s.title || ps.f !== JSON.stringify(s.foundation) || ps.pu !== p.u) {
        st.sEdit++
        ch = true
      }
      s.prayers.forEach((pr) => {
        seenP[pr.u] = 1
        const p2 = pubP[pr.u]
        if (!p2) {
          st.pAdd++
          flag[pr.u] = 'New'
          ch = true
        } else if (p2.text !== pr.text || p2.scr !== JSON.stringify(pr.scripture)) {
          st.pEdit++
          flag[pr.u] = 'Edited'
          ch = true
        } else if (p2.su !== s.u) {
          st.pMove++
          flag[pr.u] = 'Moved'
          ch = true
        }
      })
      if (ps && lostFrom[s.u]) ch = true
      secFlag[s.u] = ch
    })
  })
  Object.keys(pubP).forEach((u) => !seenP[u] && st.pDel++)
  Object.keys(pubS).forEach((u) => !seenS[u] && st.sDel++)
  Object.keys(pubPart).forEach((u) => !seenPart[u] && st.partDel++)
  const total = Object.values(st).reduce((a, b) => a + b, 0)
  return { st, total, flag, secFlag }
}

// ---- what stops a publish (design: problems) ----
export function problems(d: Draft): Problem[] {
  const out: Problem[] = []
  d.forEach((p, pi) => {
    if (!p.title.trim()) out.push({ label: `${partLabel(pi)} has no title`, sel: { kind: 'part', u: p.u } })
    p.sections.forEach((s, si) => {
      if (!s.title.trim()) out.push({ label: `Section ${pi + 1}.${si + 1} has no title`, sel: { kind: 'section', u: s.u } })
      if (s.kind !== 'list' && !s.prayers.length) out.push({ label: `Section ${pi + 1}.${si + 1} has no prayers`, sel: { kind: 'section', u: s.u } })
      s.prayers.forEach((pr, i) => {
        if (!pr.text.trim()) out.push({ label: `Prayer ${pi + 1}.${si + 1}.${i + 1} is empty`, sel: { kind: 'section', u: s.u }, fu: pr.u })
      })
    })
  })
  return out
}

// ---- the published shape (design: clean) ----
// keepExtras: books whose sections carry more than title/foundation/prayers (JCFP's
// hideTitle, lists, weekly links) keep every field; Covenant is reduced to its own fields.
const squash = (t: string) => t.replace(/[ \t]+/g, ' ').trim()
export function clean(d: Draft, keepExtras: boolean): Part[] {
  if (keepExtras)
    return d.map((p) => ({
      ...p,
      title: p.title.trim(),
      subtitle: (p.subtitle || '').trim(),
      sections: p.sections.map((s) => ({ ...s, title: s.title.trim(), prayers: (s.prayers || []).map((pr) => ({ ...pr, text: squash(pr.text) })) })),
    })) as unknown as Part[]
  return d.map((p, pi) => ({
    u: p.u,
    label: partLabel(pi),
    title: p.title.trim(),
    subtitle: (p.subtitle || '').trim(),
    sections: p.sections.map((s) => ({
      u: s.u,
      title: s.title.trim(),
      foundation: s.foundation,
      prayers: s.prayers.map((pr) => ({ u: pr.u, text: squash(pr.text), scripture: pr.scripture })),
    })),
  })) as unknown as Part[]
}

export function stats(data: Part[], st: DiffStats) {
  return {
    parts: data.length,
    sections: data.reduce((a, p) => a + p.sections.length, 0),
    prayers: data.reduce((a, p) => a + p.sections.reduce((b, s) => b + s.prayers.length, 0), 0),
    changes: st,
  }
}
