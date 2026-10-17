import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseWeekly } from './parse.ts'

const oct12 = readFileSync(new URL('./fixtures/oct-12.txt', import.meta.url), 'utf8')

describe('parseWeekly', () => {
  it('splits the 12 October 2026 sheet into its seven prayers', () => {
    const r = parseWeekly(oct12)
    expect(r.prayers).toHaveLength(7)
    expect(r.week_of).toBe('2026-10-12')
    expect(r.title).toBe('Weekly Kingdom Prayers')
    expect(r.prayers[0].ref).toBe('Acts 19:20')
    expect(r.prayers[0].text).toMatch(/^Father, let the heavens be opened over every minister/)
    expect(r.prayers[0].text).not.toMatch(/\n/)
    expect(r.prayers[1].ref).toBe('Psalm 105:19')
    expect(r.closing).toMatch(/AMEN/i)
  })

  it('finds nothing in text without numbered prayers', () => {
    expect(parseWeekly('hello\nthere').prayers).toHaveLength(0)
  })

  it('ignores page markers and keeps wrapped lines with their prayer', () => {
    const r = parseWeekly('1. First line\ncontinues here\n-- 1 of 2 --\n2) Second, according to John 3:16, which says love.\nIn Jesus name we pray, Amen.')
    expect(r.prayers.map((p) => p.text)).toEqual(['First line continues here', 'Second, according to John 3:16, which says love.'])
    expect(r.prayers[1].ref).toBe('John 3:16')
    expect(r.closing).toBe('In Jesus name we pray, Amen.')
  })
})
