import type { Part } from './types.ts'

// Progress blobs and book layouts, ported from design/src/book/app.js (layoutOf, layMaps,
// remapBlob, mergeData). A layout gives every part/section/prayer a stable id (`u`), so
// progress follows a prayer when an admin publishes a version that moves things around.

export type Layout = { u: string; s: { u: string; p: string[] }[] }[]

export type Plan = { scope?: string; parts?: number[]; days?: unknown[]; today?: unknown; [k: string]: unknown } | null

export type Blob = {
  v: 3
  bv: number
  reset: number | null
  prayed: Record<string, unknown>
  fav: Record<string, unknown>
  bm: Record<string, unknown>
  plan: Plan
  ink: Record<string, unknown[]>
  last: string | null
  hist: Record<string, string[]>
}

type WithU = { u?: string }

export function layoutOf(data: Part[]): Layout {
  return data.map((p, pi) => ({
    u: (p as WithU).u || `part-${pi + 1}`,
    s: p.sections.map((s, si) => ({
      u: (s as WithU).u || `s-${pi + 1}-${si + 1}`,
      p: s.prayers.map((pr, i) => (pr as WithU).u || `s-${pi + 1}-${si + 1}-${i + 1}`),
    })),
  }))
}

export function layMaps(lay: Layout) {
  const pu: Record<string, string> = {}, up: Record<string, string> = {}
  const su: Record<string, string> = {}, us: Record<string, string> = {}
  const partU: Record<number, string> = {}, upart: Record<string, number> = {}
  lay.forEach((p, pi) => {
    partU[pi + 1] = p.u
    upart[p.u] = pi + 1
    p.s.forEach((s, si) => {
      const sid = `s-${pi + 1}-${si + 1}`
      su[sid] = s.u
      us[s.u] = sid
      s.p.forEach((u, i) => {
        const id = `${sid}-${i + 1}`
        pu[id] = u
        up[u] = id
      })
    })
  })
  return { pu, up, su, us, partU, upart }
}

// Re-key a progress blob from one layout to another. Weekly ids (`w-…`) never move.
export function remapBlob(b: Blob, from: Layout, to: Layout): Blob {
  const A = layMaps(from), B = layMaps(to)
  const P = (k: string) => (k.startsWith('w-') ? k : B.up[A.pu[k]])
  const S = (k: string) => (k.startsWith('w-') ? k : B.us[A.su[k]])
  const PT = (n: number) => B.upart[A.partU[n]]
  const keys = <V>(o: Record<string, V> | undefined, f: (k: string) => string | undefined | null) => {
    const r: Record<string, V> = {}
    Object.keys(o || {}).forEach((k) => {
      const n = f(k)
      if (n) r[n] = o![k]
    })
    return r
  }
  const hist: Blob['hist'] = {}
  Object.entries(b.hist || {}).forEach(([d, l]) => {
    const m = (l || []).map(P).filter(Boolean)
    if (m.length) hist[d] = m
  })
  const ink = keys(b.ink, (k) =>
    k === 'title' || k === 'contents' ? k : /^part-\d+$/.test(k) ? (PT(+k.slice(5)) ? `part-${PT(+k.slice(5))}` : null) : S(k),
  )
  const plan = b.plan ? { ...b.plan, today: null } : null
  if (plan && Array.isArray(plan.parts)) {
    plan.parts = [...new Set(plan.parts.map(PT).filter(Boolean))].sort((x, y) => x - y)
    if (plan.scope === 'parts' && !plan.parts.length) plan.scope = 'all'
  }
  return { ...b, prayed: keys(b.prayed, P), fav: keys(b.fav, P), bm: keys(b.bm, S), ink, hist, plan, last: b.last ? S(b.last) || null : null }
}

// Combine this device's blob (a) with the account's (b). Marks are unioned, ink strokes
// and history are merged, and the plan with more recorded days wins.
export function mergeData(a: Blob, b: Partial<Blob> | null | undefined): Blob {
  b = b || {}
  const ink: Blob['ink'] = { ...(b.ink || {}) }
  Object.entries(a.ink || {}).forEach(([k, list]) => {
    const have = new Set((ink[k] || []).map((s) => JSON.stringify(s)))
    ink[k] = [...(ink[k] || []), ...list.filter((s) => !have.has(JSON.stringify(s)))]
  })
  const hist: Blob['hist'] = { ...(b.hist || {}) }
  Object.entries(a.hist || {}).forEach(([d, l]) => {
    hist[d] = [...new Set([...(hist[d] || []), ...l])]
  })
  const pa = a.plan, pb = b.plan
  const plan = pa && pb ? ((pb.days || []).length > (pa.days || []).length ? pb : pa) : pa || pb || null
  return {
    v: 3,
    bv: a.bv || 0,
    reset: a.reset || b.reset || null,
    prayed: { ...(b.prayed || {}), ...(a.prayed || {}) },
    fav: { ...(b.fav || {}), ...(a.fav || {}) },
    bm: { ...(b.bm || {}), ...(a.bm || {}) },
    plan,
    ink,
    last: a.last || b.last || null,
    hist,
  }
}
