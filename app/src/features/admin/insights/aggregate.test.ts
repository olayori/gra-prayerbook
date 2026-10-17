import { describe, expect, it } from 'vitest'
import type { Draft } from '../editor/engine.ts'
import { aggregate, type UsageRow } from './aggregate.ts'

const pub: Draft = [
  { u: 'P1', title: 'FIRST', subtitle: '', sections: [{ u: 'S1', title: 'Mornings', foundation: [], prayers: [{ u: 'A', text: 'Prayer A', scripture: [] }, { u: 'B', text: 'Prayer B', scripture: [] }] }] },
  { u: 'P2', title: 'SECOND', subtitle: '', sections: [{ u: 'S2', title: 'Evenings', foundation: [], prayers: [{ u: 'C', text: 'Prayer C', scripture: [] }] }] },
] as Draft
const today = new Date(2026, 9, 17)
const rows: UsageRow[] = [
  { day: '2026-10-15', kind: 'pray', ref: 'A', n: 3 },
  { day: '2026-10-16', kind: 'pray', ref: 'C', n: 5 },
  { day: '2026-10-17', kind: 'pray', ref: 'A', n: 1 },
  { day: '2026-10-17', kind: 'pray', ref: 'GONE', n: 4 },
  { day: '2026-10-17', kind: 'open', ref: 'S2', n: 2 },
  { day: '2026-10-16', kind: 'open', ref: 'S1', n: 7 },
  { day: '2026-10-17', kind: 'search', ref: 'healing', n: 6 },
  { day: '2026-10-16', kind: 'search', ref: 'peace', n: 2 },
]

describe('aggregate', () => {
  const r = aggregate(rows, pub, 7, today)

  it('totals the four tiles', () => {
    expect(r.stats).toEqual([
      { v: '13', label: 'Prayers checked' },
      { v: '9', label: 'Sessions started' },
      { v: '3', label: 'Active days' },
      { v: '4', label: 'Prayers per active day' }, // 13 / 3 = 4.33
    ])
  })

  it('has one bar per day, oldest first, scaled to the busiest day', () => {
    expect(r.dayBars).toHaveLength(7)
    expect(r.first).toBe('2026-10-11')
    expect(r.dayBars.at(-1)).toMatchObject({ k: '2026-10-17', n: 5, h: '100%' })
    expect(r.dayBars.at(-3)).toMatchObject({ k: '2026-10-15', n: 3, h: '60%' })
  })

  it('orders the most prayed and drops ids no longer in the book', () => {
    expect(r.top).toEqual([
      { u: 'C', num: '2.1.1', text: 'Prayer C', n: 5 },
      { u: 'A', num: '1.1.1', text: 'Prayer A', n: 4 },
    ])
    expect(r.secs.map((s) => [s.num, s.text, s.n])).toEqual([['1.1', 'Mornings', 7], ['2.1', 'Evenings', 2]])
  })

  it('sums parts and lists themes', () => {
    expect(r.parts).toEqual([{ label: 'Part One', n: '4', w: '80%' }, { label: 'Part Two', n: '5', w: '100%' }])
    expect(r.themes).toEqual([{ label: 'healing', n: 6 }, { label: 'peace', n: 2 }])
  })

  it('rounds prayers per active day and copes with no activity', () => {
    expect(aggregate([], pub, 7, today).stats.map((s) => s.v)).toEqual(['0', '0', '0', '0'])
  })
})
