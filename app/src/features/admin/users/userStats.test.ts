import { describe, expect, it } from 'vitest'
import { filterUsers, histStats, toCsv, userRow, type UserRow } from './userStats.ts'

const day = (offset: number, from = new Date(2026, 9, 17)) => {
  const d = new Date(from)
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = new Date(2026, 9, 17)

describe('histStats', () => {
  it('counts a streak that includes today', () => {
    expect(histStats({ [day(0)]: ['a'], [day(-1)]: ['b'], [day(-3)]: ['c'] }, today)).toEqual({ cur: 2, best: 2, days: 3 })
  })
  it('a streak that ended yesterday still counts', () => {
    expect(histStats({ [day(-1)]: ['a'], [day(-2)]: ['b'], [day(-3)]: ['c'] }, today)).toEqual({ cur: 3, best: 3, days: 3 })
  })
  it('a gap resets the current streak', () => {
    expect(histStats({ [day(-2)]: ['a'], [day(-10)]: ['b'] }, today)).toEqual({ cur: 0, best: 1, days: 2 })
  })
})

describe('userRow', () => {
  it('maps prayer positions to stable ids for the edition the user is on', () => {
    const layouts = { 0: { 's-1-1-1': 'U1', 's-1-1-2': 'U2' } }
    const r = userRow({ user_id: 'x', email: 'a@b.c', name: 'Ann', created_at: '2026-10-01T00:00:00Z', last_sign_in_at: '2026-10-10T00:00:00Z', state_at: '2026-10-12T00:00:00Z', is_member: true, role: null, ink_pages: 2,
      data: { prayed: { 's-1-1-1': 1, 's-9-9-9': 1 }, hist: { '2026-10-12': ['s-1-1-2'] }, fav: { a: 1 }, bm: {}, plan: { x: 1 } } }, layouts, today)
    expect(r).toMatchObject({ prayed: 2, prayedU: ['U1'], hist: { '2026-10-12': ['U2'] }, fav: 1, bm: 0, ink: 2, plan: true, active: '2026-10-12T00:00:00Z' })
  })
})

const rows: UserRow[] = [
  { id: '1', email: 'zed@x.com', name: 'Zed', created: '2026-10-01', active: '2026-10-16', member: true, role: 'admin', prayedU: [], hist: {}, prayed: 5, days: 2, streak: 1, best: 2, fav: 0, bm: 0, ink: 0, plan: false },
  { id: '2', email: 'amy@x.com', name: '', created: '2026-10-02', active: null, member: false, role: null, prayedU: [], hist: {}, prayed: 0, days: 0, streak: 0, best: 0, fav: 0, bm: 0, ink: 0, plan: false },
  { id: '3', email: 'bob@x.com', name: 'Bob, "the" Builder', created: '2026-10-03', active: '2026-10-10', member: true, role: null, prayedU: [], hist: {}, prayed: 9, days: 4, streak: 0, best: 3, fav: 1, bm: 2, ink: 0, plan: true },
]

describe('filterUsers', () => {
  it('filters and sorts like the old console', () => {
    expect(filterUsers(rows, '', 'members', ['prayed', -1]).map((u) => u.id)).toEqual(['3', '1'])
    expect(filterUsers(rows, '', 'pending', ['active', -1]).map((u) => u.id)).toEqual(['2'])
    expect(filterUsers(rows, '', 'staff', ['active', -1]).map((u) => u.id)).toEqual(['1'])
    expect(filterUsers(rows, 'amy', 'all', ['active', -1]).map((u) => u.id)).toEqual(['2'])
    expect(filterUsers(rows, '', 'all', ['name', 1]).map((u) => u.id)).toEqual(['2', '3', '1']) // amy (email), Bob, Zed
  })
})

describe('toCsv', () => {
  it('has the old header and quotes awkward values', () => {
    const csv = toCsv(rows)
    expect(csv.startsWith('﻿Name,Email,Role,Activated,Joined,Last active,Prayers checked,Days prayed,Current streak,Longest streak,Favorites,Bookmarks,Pages with pen notes\n')).toBe(true)
    expect(csv).toContain('"Bob, ""the"" Builder",bob@x.com,reader,yes,2026-10-03,2026-10-10,9,4,0,3,1,2,0')
  })
})
