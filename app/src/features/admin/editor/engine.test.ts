import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Part } from '../../book/types.ts'
import {
  addPart, addPrayer, addSection, clean, deletePrayer, deleteSection, diff, ensureU, History, logChange, move,
  partLabel, problems, setPartTitle, setPrayerText, setScripture, setSectionTitle, stats, swapPrayer, titleCase, type Draft,
} from './engine.ts'

const p = (text: string) => ({ text, scripture: [] })
const base = (): Draft =>
  ensureU([
    { title: 'PART ONE', subtitle: '', sections: [
      { title: 'S1', foundation: [], prayers: [p('a'), p('b')] },
      { title: 'S2', foundation: [], prayers: [p('c')] },
    ] },
    { title: 'PART TWO', subtitle: '', sections: [{ title: 'S3', foundation: [], prayers: [p('d')] }] },
  ] as Part[])
const texts = (d: Draft, pi: number, si: number) => d[pi].sections[si].prayers.map((x) => x.text)

describe('ids and labels', () => {
  it('gives every part, section and prayer the design’s stable id', () => {
    const d = ensureU(JSON.parse(readFileSync(new URL('../../../../../site/jcfp.json', import.meta.url), 'utf8')))
    expect([d[0].u, d[0].sections[0].u, d[0].sections[0].prayers[0].u]).toEqual(['part-1', 's-1-1', 's-1-1-1'])
  })
  it('names parts in words, then numbers', () => {
    expect(partLabel(0)).toBe('Part One')
    expect(partLabel(14)).toBe('Part Fifteen')
    expect(partLabel(15)).toBe('Part 16')
  })
  it('title-cases like the old console', () => {
    expect(titleCase('PRAYERS FOR THE NATIONS OF THE WORLD')).toBe('Prayers for the Nations of the World')
    expect(titleCase('THE BLOOD OF JESUS')).toBe('The Blood of Jesus')
  })
})

describe('edits', () => {
  it('never change the draft they are given', () => {
    const d = base()
    const before = JSON.stringify(d)
    setPrayerText(d, 's-1-1-1', 'x')
    setSectionTitle(d, 's-1-1', 'x')
    setPartTitle(d, 'part-1', 'x')
    expect(JSON.stringify(d)).toBe(before)
  })
  it('edit text and titles', () => {
    expect(setPrayerText(base(), 's-1-1-2', 'B')[0].sections[0].prayers[1].text).toBe('B')
    expect(setSectionTitle(base(), 's-2-1', 'New')[1].sections[0].title).toBe('New')
  })
  it('add, delete and swap', () => {
    expect(addPart(base(), 'pt1').at(-1)).toMatchObject({ u: 'pt1', title: 'NEW PART', sections: [] })
    const withSec = addSection(base(), 'part-1', 's9', 'p9')
    expect(withSec[0].sections.at(-1)).toMatchObject({ u: 's9', title: 'New section', prayers: [{ u: 'p9', text: '' }] })
    expect(texts(addPrayer(base(), 's-1-1', 'p9', 1), 0, 0)).toEqual(['a', '', 'b'])
    expect(texts(deletePrayer(base(), 's-1-1-1'), 0, 0)).toEqual(['b'])
    expect(deleteSection(base(), 's-1-2')[0].sections.map((s) => s.title)).toEqual(['S1'])
    expect(texts(swapPrayer(base(), 's-1-1-1', 1), 0, 0)).toEqual(['b', 'a'])
  })
  it('move before, after and into for every kind', () => {
    expect(texts(move(base(), 'prayer', 's-1-1-1', 's-1-1-2', 'after'), 0, 0)).toEqual(['b', 'a'])
    expect(texts(move(base(), 'prayer', 's-1-1-2', 's-1-1-1', 'before'), 0, 0)).toEqual(['b', 'a'])
    expect(texts(move(base(), 'prayer', 's-1-1-1', 's-2-1', 'into'), 1, 0)).toEqual(['d', 'a'])
    expect(move(base(), 'section', 's-1-2', 's-1-1', 'before')[0].sections.map((s) => s.title)).toEqual(['S2', 'S1'])
    expect(move(base(), 'section', 's-1-1', 'part-2', 'into')[1].sections.map((s) => s.title)).toEqual(['S3', 'S1'])
    expect(move(base(), 'part', 'part-1', 'part-2', 'after').map((x) => x.title)).toEqual(['PART TWO', 'PART ONE'])
  })
  it('add, edit and remove scripture', () => {
    const added = setScripture(base(), 'p', 's-1-1-1', -1, { ref: 'John 3:16', verses: [] })
    expect(added[0].sections[0].prayers[0].scripture).toEqual([{ ref: 'John 3:16', verses: [] }])
    const edited = setScripture(added, 'p', 's-1-1-1', 0, { ref: 'John 3:17', verses: [] })
    expect(edited[0].sections[0].prayers[0].scripture[0].ref).toBe('John 3:17')
    expect(setScripture(edited, 'p', 's-1-1-1', 0, null)[0].sections[0].prayers[0].scripture).toEqual([])
    expect(setScripture(base(), 'f', 's-1-1', -1, { ref: 'Ps 1', verses: [] })[0].sections[0].foundation).toHaveLength(1)
  })
})

describe('History', () => {
  it('undoes and redoes, joining quick edits to the same field', () => {
    const h = new History()
    const d0 = base(), d1 = setPrayerText(d0, 's-1-1-1', 'a1'), d2 = setPrayerText(d1, 's-1-1-1', 'a12')
    h.push(d0, 'p:s-1-1-1', 1000)
    h.push(d1, 'p:s-1-1-1', 2000) // within 4 s: same undo step
    expect(h.undo(d2)).toEqual(d0)
    expect(h.redo(d0)).toEqual(d2)
  })
  it('keeps 80 steps', () => {
    const h = new History()
    for (let i = 0; i < 100; i++) h.push(setPrayerText(base(), 's-1-1-1', String(i)), undefined, i * 10_000)
    let n = 0
    let cur: Draft | null = base()
    while ((cur = h.undo(cur!))) n++
    expect(n).toBe(80)
  })
})

describe('logChange', () => {
  it('joins edits to the same thing within five minutes', () => {
    let log = logChange([], { what: 'Edited prayer 1.1.1', key: 'p:x', by: 'me' }, 0)
    log = logChange(log, { what: 'Edited prayer 1.1.1', key: 'p:x', by: 'me' }, 60_000)
    expect(log).toHaveLength(1)
    log = logChange(log, { what: 'Edited prayer 1.1.1', key: 'p:x', by: 'me' }, 60_000 + 300_001)
    expect(log).toHaveLength(2)
  })
})

describe('diff', () => {
  it('counts each kind of change and flags prayers', () => {
    const pub = base()
    let d = setPrayerText(pub, 's-1-1-1', 'A')
    d = move(d, 'prayer', 's-1-1-2', 's-2-1', 'into')
    d = addPrayer(d, 's-2-1', 'new1')
    d = deletePrayer(d, 's-1-2-1')
    d = setSectionTitle(d, 's-1-2', 'S2!')
    d = move(d, 'part', 'part-1', 'part-2', 'after')
    const r = diff(pub, d)
    expect(r.st).toMatchObject({ pEdit: 1, pMove: 1, pAdd: 1, pDel: 1, sEdit: 1, partEdit: 2 })
    expect(r.flag).toMatchObject({ 's-1-1-1': 'Edited', 's-1-1-2': 'Moved', new1: 'New' })
    expect(r.secFlag['s-1-1']).toBe(true) // lost a prayer
    expect(r.total).toBe(7)
  })
  it('is empty for an unchanged draft', () => {
    expect(diff(base(), base()).total).toBe(0)
  })
})

describe('problems', () => {
  it('names each problem the way the old console did', () => {
    let d = setPartTitle(base(), 'part-2', ' ')
    d = setSectionTitle(d, 's-1-2', '')
    d = deletePrayer(d, 's-1-2-1')
    d = addPrayer(d, 's-1-1', 'e1')
    expect(problems(d).map((x) => x.label)).toEqual([
      'Prayer 1.1.3 is empty',
      'Section 1.2 has no title',
      'Section 1.2 has no prayers',
      'Part Two has no title',
    ])
    expect(problems(d)[0]).toMatchObject({ sel: { kind: 'section', u: 's-1-1' }, fu: 'e1' })
  })
})

describe('clean and stats', () => {
  it('Covenant keeps only its own fields and labels the parts', () => {
    const d = setPrayerText(base(), 's-1-1-1', '  a   b ')
    ;(d[0].sections[0] as Record<string, unknown>).hideTitle = true
    const c = clean(d, false)
    expect(c[0]).toMatchObject({ label: 'Part One', title: 'PART ONE' })
    expect(c[0].sections[0]).not.toHaveProperty('hideTitle')
    expect(c[0].sections[0].prayers[0].text).toBe('a b')
  })
  it('other books keep every field', () => {
    const d = base()
    ;(d[0].sections[0] as Record<string, unknown>).hideTitle = true
    ;(d[0].sections[0].prayers[0] as Record<string, unknown>).link = 'weekly'
    const c = clean(d, true)
    expect(c[0].sections[0]).toHaveProperty('hideTitle', true)
    expect(c[0].sections[0].prayers[0]).toHaveProperty('link', 'weekly')
  })
  it('counts parts, sections and prayers', () => {
    expect(stats(clean(base(), false), diff(base(), base()).st)).toMatchObject({ parts: 2, sections: 3, prayers: 4 })
  })
})
