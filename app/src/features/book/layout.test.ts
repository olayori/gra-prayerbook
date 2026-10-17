import { describe, expect, it } from 'vitest'
import { layoutOf, mergeData, remapBlob, type Blob } from './layout.ts'
import type { Part } from './types.ts'

const pr = (text: string, u?: string) => ({ text, scripture: [], ...(u ? { u } : {}) })
const blob = (b: Partial<Blob>): Blob => ({ v: 3, bv: 0, reset: null, prayed: {}, fav: {}, bm: {}, plan: null, ink: {}, last: null, hist: {}, ...b })

describe('layoutOf', () => {
  it('uses positional ids when the content has no stable ids', () => {
    const data: Part[] = [{ title: 'P', subtitle: '', sections: [{ title: 'S', foundation: [], prayers: [pr('a'), pr('b')] }] }]
    expect(layoutOf(data)).toEqual([{ u: 'part-1', s: [{ u: 's-1-1', p: ['s-1-1-1', 's-1-1-2'] }] }])
  })
})

describe('remapBlob', () => {
  // v1: one section [a, b]. v2: a new section inserted first, and b moved before a.
  const v1 = [{ u: 'P', s: [{ u: 'S1', p: ['a', 'b'] }] }]
  const v2 = [{ u: 'P', s: [{ u: 'NEW', p: ['n'] }, { u: 'S1', p: ['b', 'a'] }] }]

  it('moves marks, bookmarks, history and the last section with their prayers', () => {
    const out = remapBlob(
      blob({ prayed: { 's-1-1-1': 1 }, fav: { 's-1-1-2': 1 }, bm: { 's-1-1': '2026-10-01' }, hist: { '2026-10-01': ['s-1-1-1', 's-1-1-2'] }, last: 's-1-1' }),
      v1,
      v2,
    )
    expect(out.prayed).toEqual({ 's-1-2-2': 1 })
    expect(out.fav).toEqual({ 's-1-2-1': 1 })
    expect(out.bm).toEqual({ 's-1-2': '2026-10-01' })
    expect(out.hist['2026-10-01']).toEqual(['s-1-2-2', 's-1-2-1'])
    expect(out.last).toBe('s-1-2')
  })

  it('drops marks for removed prayers and keeps weekly ids as they are', () => {
    const out = remapBlob(blob({ prayed: { 's-1-1-1': 1, 'w-20261012-1': 1 } }), v1, [{ u: 'P', s: [{ u: 'S1', p: ['b'] }] }])
    expect(out.prayed).toEqual({ 'w-20261012-1': 1 })
  })
})

describe('mergeData', () => {
  it('unions marks and history, de-duplicates ink, keeps the longer plan', () => {
    const local = blob({ prayed: { a: 1 }, hist: { d1: ['a'] }, ink: { s: [{ x: 1 }] }, plan: { days: [1] }, last: null })
    const remote = { prayed: { b: 1 }, hist: { d1: ['b'], d2: ['c'] }, ink: { s: [{ x: 1 }, { x: 2 }] }, plan: { days: [1, 2] }, last: 's-1-1' }
    const m = mergeData(local, remote)
    expect(m.prayed).toEqual({ a: 1, b: 1 })
    expect(m.hist).toEqual({ d1: ['b', 'a'], d2: ['c'] })
    expect(m.ink.s).toEqual([{ x: 1 }, { x: 2 }])
    expect(m.plan).toEqual({ days: [1, 2] })
    expect(m.last).toBe('s-1-1')
  })

  it('handles an account with no saved data yet', () => {
    expect(mergeData(blob({ prayed: { a: 1 } }), null).prayed).toEqual({ a: 1 })
  })
})
