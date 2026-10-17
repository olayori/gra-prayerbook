import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BOOKS } from './books.ts'
import { buildBook, titleCase } from './model.ts'
import type { Part } from './types.ts'

const read = (f: string): Part[] => JSON.parse(readFileSync(new URL(`../../../../site/${f}`, import.meta.url), 'utf8'))
const covenant = read('prayers.json')
const jcfp = read('jcfp.json')
const none = { prayed: {}, fav: {}, bm: {} }

describe('titleCase', () => {
  it('matches the design’s heading case', () => {
    expect(titleCase('GOD’S REMNANT ASSEMBLY WORLDWIDE')).toBe('God’s Remnant Assembly Worldwide')
    expect(titleCase('PRAYERS FOR THE CHURCH AND THE NATIONS')).toBe('Prayers for the Church and the Nations')
    expect(titleCase('GRA FAMILIES')).toBe('GRA Families')
  })
})

describe('Book of Covenant Prayers', () => {
  const view = buildBook(BOOKS.covenant, covenant, none, true)
  const nPrayers = covenant.reduce((a, p) => a + p.sections.reduce((b, s) => b + s.prayers.length, 0), 0)

  it('counts parts, sections and prayers', () => {
    expect(view.parts).toHaveLength(covenant.length)
    expect(view.total).toBe(nPrayers)
    expect(view.stats).toMatch(new RegExp(`^${covenant.length} parts · \\d+ sections · ${nPrayers} prayers$`))
  })

  it('uses the design’s ids and labels', () => {
    const s = view.parts[0].sections[1]
    expect(view.parts[0]).toMatchObject({ id: 'part-1', label: 'Part One' })
    expect(s).toMatchObject({ id: 's-1-2', num: '1.2', kicker: 'Section 1.2', showHdr: true })
    expect(s.prayers[0]).toMatchObject({ id: 's-1-2-1', n: 1 })
  })

  it('applies prayed, favorite and bookmark marks', () => {
    const v = buildBook(BOOKS.covenant, covenant, { prayed: { 's-1-1-1': 1, 's-1-1-2': 1 }, fav: { 's-1-1-1': 1 }, bm: { 's-1-1': '2026-10-16' } }, true)
    const s = v.parts[0].sections[0]
    expect(v.done).toBe(2)
    expect(s.done).toBe(2)
    expect(s.progress).toBe(`2 of ${s.total} prayed`)
    expect(s.prayers[0]).toMatchObject({ checked: true, fav: true })
    expect(s.bookmarked).toBe(true)
  })

  it('shows reference chips instead of verses when scripture is hidden', () => {
    const withVerses = view.parts.flatMap((p) => p.sections).flatMap((s) => s.prayers).find((p) => p.scripture.some((sc) => sc.verses.length))!
    const hidden = buildBook(BOOKS.covenant, covenant, none, false).parts.flatMap((p) => p.sections).flatMap((s) => s.prayers).find((p) => p.id === withVerses.id)!
    expect(withVerses.showScripture).toBe(true)
    expect(hidden.showScripture).toBe(false)
    expect(hidden.refChips.length).toBeGreaterThan(0)
  })
})

describe('Jesus Chosen Fast and Prayer', () => {
  const view = buildBook(BOOKS.jcfp, jcfp, none, true)

  it('drops the weekly placeholder sections and numbers prayers through each watch', () => {
    const watch2 = view.parts[1]
    expect(watch2.sections.some((s) => /7 Point Weekly/.test(s.title))).toBe(false)
    const ns = watch2.sections.flatMap((s) => s.prayers.map((p) => p.n))
    expect(ns).toEqual(ns.map((_, i) => i + 1))
    expect(watch2.sections[1].tocNum).toBe(String(watch2.sections[0].total + 1))
  })

  it('places the weekly prayers after the last watch and renders the lists part', () => {
    expect(view.parts.map((p) => p.weeklyAfter)).toEqual([false, false, true, false])
    const lists = view.parts[3]
    expect(lists.showNum).toBe(false)
    expect(lists.sections.every((s) => s.isList && s.kicker === 'Prayer List')).toBe(true)
    expect(lists.count).toMatch(/^3 lists · \d+ names$/)
  })

  it('uses the book’s own part labels and watch actions', () => {
    expect(view.parts[0]).toMatchObject({ label: 'Prayer Watch ONE', hasActions: true })
    expect(view.parts[3].hasActions).toBe(false)
    expect(view.stats).toMatch(/^3 prayer watches · \d+ prayers · 3 lists$/)
  })
})
