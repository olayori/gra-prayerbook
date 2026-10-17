import { partLabel, type Draft } from '../editor/engine.ts'
import { dayKey } from '../users/userStats.ts'

// The Insights tab's numbers, ported from the old Admin Console (design/src/admin/app.js:
// insightsVals). Usage refs are stable ids, resolved against the published edition.
export type UsageRow = { day: string; kind: string; ref: string; n: number }
export type Ranked = { u: string; num: string; text: string; n: number }

export function aggregate(rows: UsageRow[], pub: Draft, days: number, today = new Date()) {
  const byDay: Record<string, number> = {}, pr: Record<string, number> = {}, sec: Record<string, number> = {}, th: Record<string, number> = {}
  let tp = 0, to = 0
  rows.forEach((r) => {
    if (r.kind === 'pray') {
      tp += r.n
      byDay[r.day] = (byDay[r.day] || 0) + r.n
      pr[r.ref] = (pr[r.ref] || 0) + r.n
    } else if (r.kind === 'open') {
      to += r.n
      sec[r.ref] = (sec[r.ref] || 0) + r.n
    } else if (r.kind === 'search') th[r.ref] = (th[r.ref] || 0) + r.n
  })
  const pos: Record<string, { num: string; text: string; pi: number }> = {}, spos: Record<string, { num: string; title: string }> = {}
  pub.forEach((p, pi) =>
    p.sections.forEach((s, si) => {
      spos[s.u] = { num: `${pi + 1}.${si + 1}`, title: s.title }
      s.prayers.forEach((x, i) => (pos[x.u] = { num: `${pi + 1}.${si + 1}.${i + 1}`, text: x.text, pi }))
    }),
  )
  const part: Record<number, number> = {}
  Object.entries(pr).forEach(([u, n]) => {
    if (pos[u]) part[pos[u].pi] = (part[pos[u].pi] || 0) + n
  })
  const dl: { k: string; n: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(today)
    x.setDate(x.getDate() - i)
    const k = dayKey(x)
    dl.push({ k, n: byDay[k] || 0 })
  }
  const max = Math.max(1, ...dl.map((x) => x.n)), pmax = Math.max(1, ...Object.values(part))
  const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])
  const active = Object.keys(byDay).length
  const stats: [number, string][] = [[tp, 'Prayers checked'], [to, 'Sessions started'], [active, 'Active days'], [active ? Math.round(tp / active) : 0, 'Prayers per active day']]
  return {
    stats: stats.map(([v, label]) => ({ v: v.toLocaleString(), label })),
    dayBars: dl.map((x) => ({ ...x, h: `${Math.round((x.n / max) * 100)}%` })),
    first: dl[0]?.k ?? dayKey(today),
    parts: pub.map((_, pi) => ({ label: partLabel(pi), n: (part[pi] || 0).toLocaleString(), w: `${((part[pi] || 0) / pmax) * 100}%` })),
    top: top(pr).filter(([u]) => pos[u]).slice(0, 12).map(([u, n]): Ranked => ({ u, num: pos[u].num, text: pos[u].text, n })),
    secs: top(sec).filter(([u]) => spos[u]).slice(0, 12).map(([u, n]): Ranked => ({ u, num: spos[u].num, text: spos[u].title, n })),
    themes: top(th).slice(0, 16).map(([label, n]) => ({ label, n })),
  }
}
