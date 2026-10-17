import { describe, expect, it } from 'vitest'
import { customTitle, pickWeek, weekLabel, type Week } from './week.ts'

const week = (week_of: string): Week => ({ week_of, title: '', intro: '', prayers: [], closing: '' })

describe('weekLabel', () => {
  it('formats the calendar date without timezone drift', () => {
    expect(weekLabel('2026-10-12', 'en-GB')).toBe('12 October 2026')
    expect(weekLabel('2026-01-01', 'en-GB')).toBe('1 January 2026')
  })
})

describe('customTitle', () => {
  it('hides the default title, which the kicker already shows', () => {
    expect(customTitle('Weekly Kingdom Prayers')).toBeNull()
    expect(customTitle('  GRA weekly kingdom prayers ')).toBeNull()
    expect(customTitle('')).toBeNull()
  })
  it('keeps custom titles', () => {
    expect(customTitle('Mega Exploits 2026')).toBe('Mega Exploits 2026')
  })
})

describe('pickWeek', () => {
  const weeks = [week('2026-10-12'), week('2026-10-05')]
  it('defaults to the newest week', () => expect(pickWeek(weeks)?.week_of).toBe('2026-10-12'))
  it('selects a past week', () => expect(pickWeek(weeks, '2026-10-05')?.week_of).toBe('2026-10-05'))
  it('falls back to the newest for unknown weeks', () => expect(pickWeek(weeks, '2020-01-06')?.week_of).toBe('2026-10-12'))
  it('handles no weeks', () => expect(pickWeek([])).toBeUndefined())
})
