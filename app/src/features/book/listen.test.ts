import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chunks } from '../../lib/speech.ts'
import { timer, type Timer } from './focusTimer.ts'
import { listenItems, sectionOrder } from './listen.ts'
import type { Part } from './types.ts'

const read = (f: string): Part[] => JSON.parse(readFileSync(new URL(`../../../../site/${f}`, import.meta.url), 'utf8'))
const covenant = read('prayers.json')
const jcfp = read('jcfp.json')

describe('listenItems', () => {
  it('reads a section’s scripture foundation, then each prayer', () => {
    const s = covenant[0].sections[0]
    const q = listenItems('covenant', covenant, 's-1-1', false)
    expect(q.title).toBe(s.title)
    expect(q.items[0]).toMatchObject({ pid: null, kicker: '1.1 · Scripture foundation' })
    expect(q.items[1]).toMatchObject({ pid: 's-1-1-1', kicker: `1.1 · Prayer 1 of ${s.prayers.length}`, text: `Prayer 1. ${s.prayers[0].text}` })
  })

  it('adds the scripture under each prayer when asked', () => {
    const withV = listenItems('jcfp', jcfp, 's-1-1', true).items[0].text
    expect(withV).toContain('1 Timothy 2:1-3.')
    expect(listenItems('jcfp', jcfp, 's-1-1', false).items[0].text).not.toContain('1 Timothy')
  })

  it('reads a whole JCFP watch with running numbers and skips the weekly placeholder', () => {
    const q = listenItems('jcfp', jcfp, 'part-2', false)
    expect(q.title).toBe('Prayer Watch TWO')
    expect(q.items.every((x) => !/7 Point Weekly/.test(x.text))).toBe(true)
    expect(q.items.at(-1)!.kicker).toBe(`Prayer Watch TWO · Prayer ${q.items.length} of ${q.items.length}`)
  })
})

describe('sectionOrder', () => {
  it('lists every section in reading order, without JCFP’s weekly placeholders', () => {
    const order = sectionOrder('jcfp', jcfp)
    expect(order[0]).toBe('s-1-1')
    expect(order).not.toContain('s-2-11') // "Pray for the 7 Point Weekly Kingdom Prayers"
    expect(sectionOrder('covenant', covenant)).toHaveLength(covenant.reduce((a, p) => a + p.sections.length, 0))
  })
})

describe('chunks', () => {
  it('splits long text at sentence ends into pieces of about 220 characters', () => {
    const s = 'Father, we thank You. '.repeat(30)
    const c = chunks(s)
    expect(c.length).toBeGreaterThan(1)
    expect(c.every((x) => x.length <= 242)).toBe(true)
    expect(c.join('')).toBe(s)
  })
})

describe('Focused Mode timer', () => {
  const off: Timer = { dur: 0, left: 0, run: 'stopped' }
  it('sets a duration, runs, pauses and resumes', () => {
    let t = timer(off, { type: 'dur', sec: 30 })
    expect(t).toEqual({ dur: 30, left: 30, run: 'stopped' })
    t = timer(t, { type: 'playPause' })
    expect(t.run).toBe('running')
    t = timer(timer(t, { type: 'tick' }), { type: 'playPause' })
    expect(t).toEqual({ dur: 30, left: 29, run: 'paused' })
    expect(timer(t, { type: 'playPause' }).run).toBe('running')
  })
  it('starts each prayer with full time and keeps running after time is up', () => {
    const up = timer({ dur: 30, left: 1, run: 'running' }, { type: 'up' })
    expect(up.run).toBe('done')
    expect(timer(up, { type: 'prayer' })).toEqual({ dur: 30, left: 30, run: 'running' })
  })
  it('clamps the duration to 0–60 minutes and ignores play with no duration', () => {
    expect(timer(off, { type: 'dur', sec: 99999 }).dur).toBe(3600)
    expect(timer(off, { type: 'dur', sec: -5 }).dur).toBe(0)
    expect(timer(off, { type: 'playPause' })).toBe(off)
  })
})
