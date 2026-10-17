import type { SupabaseClient, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { BOOKS } from './books.ts'
import { BookStore } from './store.ts'
import type { Part } from './types.ts'

// In-memory localStorage (vitest runs in node).
class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}

// Just enough of the Supabase client for the sync queries BookStore makes.
type Row = { user_id: string; book?: string; data: unknown; updated_at: string }
function fakeSupabase(rows: Row[]) {
  let clock = 0
  const client = {
    upserts: 0,
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const matches = (r: Row) => Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v)
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => ((filters[k] = v), q),
        order: () => q,
        limit: () => q,
        maybeSingle: async () => (table.endsWith('versions') ? { data: null, error: null } : { data: structuredClone(rows.find(matches) ?? null), error: null }),
        single: async () => ({ data: null, error: null }),
        upsert: (row: Row) => ({
          select: () => ({
            single: async () => {
              client.upserts++
              const at = `t${++clock}`
              const i = rows.findIndex((r) => r.user_id === row.user_id && (row.book === undefined || r.book === row.book))
              const next = { ...row, data: structuredClone(row.data), updated_at: at }
              if (i >= 0) rows[i] = next
              else rows.push(next)
              return { data: { updated_at: at }, error: null }
            },
          }),
        }),
      }
      return q
    },
    rpc: async () => ({ error: null }),
  }
  return client
}

const data: Part[] = [{ title: 'P', subtitle: '', sections: [{ title: 'S', foundation: [], prayers: [{ text: 'a', scripture: [] }, { text: 'b', scripture: [] }] }] }]
const user = { id: 'u1' } as User
const ls = () => (globalThis as unknown as { localStorage: MemStorage }).localStorage

async function signedIn(rows: Row[]) {
  const sb = fakeSupabase(rows)
  const store = new BookStore(BOOKS.covenant, sb as unknown as SupabaseClient)
  await store.init(data)
  store.setUser(user)
  await new Promise((r) => setTimeout(r, 0))
  await store.pull()
  return { store, sb }
}

beforeEach(() => {
  ;(globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage()
  ls().setItem('gra-covenant-layout', '3')
})

describe('BookStore sync', () => {
  it('uses the live site’s storage keys', async () => {
    const store = new BookStore(BOOKS.jcfp, fakeSupabase([]) as unknown as SupabaseClient)
    await store.init(data)
    store.toggle('s-1-1-1')
    expect(JSON.parse(ls().getItem('gra-jcfp-prayed')!)).toEqual({ 's-1-1-1': 1 })
    expect(ls().getItem('gra-jcfp-dirty')).toBe('1')
  })

  it('merges this device with the account on first sign-in and uploads the result', async () => {
    ls().setItem('gra-covenant-prayed', JSON.stringify({ 's-1-1-1': 1 }))
    const rows: Row[] = [{ user_id: 'u1', data: { v: 3, bv: 0, prayed: { 's-1-1-2': 1 } }, updated_at: 't0' }]
    const { store } = await signedIn(rows)
    expect(store.prayed).toEqual({ 's-1-1-1': 1, 's-1-1-2': 1 })
    expect((rows[0].data as { prayed: object }).prayed).toEqual({ 's-1-1-1': 1, 's-1-1-2': 1 })
    expect(store.sync).toBe('ok')
    expect(ls().getItem('gra-covenant-dirty')).toBeNull()
  })

  it('takes the account’s data when another device changed it and this one has nothing new', async () => {
    const rows: Row[] = [{ user_id: 'u1', data: { v: 3, bv: 0, prayed: {} }, updated_at: 't0' }]
    const { store } = await signedIn(rows)
    rows[0] = { ...rows[0], data: { v: 3, bv: 0, prayed: { 's-1-1-2': 1 } }, updated_at: 'other-device' }
    await store.pull()
    expect(store.prayed).toEqual({ 's-1-1-2': 1 })
  })

  it('applies an admin reset and keeps the reset marker', async () => {
    ls().setItem('gra-covenant-prayed', JSON.stringify({ 's-1-1-1': 1 }))
    const rows: Row[] = [{ user_id: 'u1', data: { v: 3, bv: 0, reset: 1760000000, prayed: {} }, updated_at: 't0' }]
    const { store } = await signedIn(rows)
    expect(store.prayed).toEqual({})
    expect(JSON.parse(ls().getItem('gra-covenant-resetAt')!)).toBe(1760000000)
  })

  it('pushes local changes after a short delay', async () => {
    const rows: Row[] = [{ user_id: 'u1', data: { v: 3, bv: 0, prayed: {} }, updated_at: 't0' }]
    const { store } = await signedIn(rows)
    store.toggle('s-1-1-1')
    expect(await store.push()).toBe(true)
    expect((rows[0].data as { prayed: object }).prayed).toEqual({ 's-1-1-1': 1 })
    expect(store.hasUnsynced()).toBe(false)
  })
})
