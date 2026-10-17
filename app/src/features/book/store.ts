import type { SupabaseClient, User } from '@supabase/supabase-js'
import { keyFor, load, remove, save } from '../../lib/storage.ts'
import type { BookConfig } from './books.ts'
import { layMaps, layoutOf, mergeData, remapBlob, type Blob, type Layout } from './layout.ts'
import type { Part } from './types.ts'

// Local progress + account sync for one book, ported from design/src/book/app.js
// (ld/sv/markDirty, adoptLayout/checkBook/normRemote, pull/push/applyRemote, logUse/flushUse).
// It reads and writes the live site's storage keys and Supabase rows, so both stay in step.

export type SyncState = null | 'syncing' | 'ok' | 'offline' | 'error'

const SYNC_KEYS = ['prayed', 'fav', 'bookmarks', 'plan', 'ink', 'hist']
const BUNDLE_V = 0
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type Row = { data: Blob; updated_at: string }
type Meta = { uid: string; at: string } | null

export class BookStore {
  data: Part[] = []
  sync: SyncState = null
  syncAt: number | null = null
  private user: User | null = null
  private sb: SupabaseClient
  private bookV = 0
  private bookLay: Layout = []
  private bundledLay: Layout = []
  private maps: ReturnType<typeof layMaps> | null = null
  private applying = false
  private pushing = false
  private again = false
  private checking = false
  private flushing = false
  private pushTimer?: ReturnType<typeof setTimeout>
  private useTimer?: ReturnType<typeof setTimeout>
  private ready: Promise<void>
  private resolveReady!: () => void
  private listeners = new Set<() => void>()
  version = 0 // bumps on every change, for useSyncExternalStore
  private onToast: (t: string) => void = () => {}
  private book: BookConfig

  constructor(book: BookConfig, sb: SupabaseClient) {
    this.book = book
    this.sb = sb
    this.ready = new Promise((r) => (this.resolveReady = r))
  }

  // ---- local storage (the design's ld/sv) ----
  ld<T>(k: string, d: T): T {
    return load(keyFor(this.book.key, k), d)
  }
  sv(k: string, v: unknown): boolean {
    const ok = save(keyFor(this.book.key, k), v)
    if (!this.applying && SYNC_KEYS.includes(k)) this.markDirty()
    return ok
  }

  setToastHandler(fn: (t: string) => void) {
    this.onToast = fn
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() {
    this.version++
    this.listeners.forEach((f) => f())
  }

  get prayed() { return this.ld<Record<string, 1>>('prayed', {}) }
  get fav() { return this.ld<Record<string, 1>>('fav', {}) }
  get bm() { return this.ld<Record<string, string>>('bookmarks', {}) }
  get hist() { return this.ld<Record<string, string[]>>('hist', {}) }

  // ---- marks ----
  private savePrayed(next: Record<string, 1>) {
    const old = this.prayed
    const added = Object.keys(next).filter((k) => !old[k])
    if (added.length) {
      const t = dayKey(), h = this.hist
      this.sv('hist', { ...h, [t]: [...new Set([...(h[t] || []), ...added])] })
      this.logUse('pray', added)
    }
    this.sv('prayed', next)
    this.emit()
  }
  toggle(id: string) {
    const p = { ...this.prayed }
    if (p[id]) delete p[id]
    else p[id] = 1
    this.savePrayed(p)
  }
  setMany(ids: string[], on: boolean) {
    const p = { ...this.prayed }
    ids.forEach((id) => (on ? (p[id] = 1) : delete p[id]))
    this.savePrayed(p)
  }
  clearPrefix(prefix: string) {
    this.savePrayed(Object.fromEntries(Object.entries(this.prayed).filter(([k]) => !k.startsWith(prefix))) as Record<string, 1>)
  }
  toggleFav(id: string): boolean {
    const f = { ...this.fav }
    const on = !f[id]
    if (on) f[id] = 1
    else delete f[id]
    this.sv('fav', f)
    this.emit()
    return on
  }
  toggleBm(id: string): boolean {
    const b = { ...this.bm }
    const on = !b[id]
    if (on) b[id] = dayKey()
    else delete b[id]
    this.sv('bookmarks', b)
    this.emit()
    return on
  }
  markRead(sectionId: string) {
    if (this.ld('last', null) !== sectionId) save(keyFor(this.book.key, 'last'), sectionId)
  }

  // ---- book editions ----
  async init(bundled: Part[]) {
    this.bundledLay = layoutOf(bundled)
    let data = bundled, ver = BUNDLE_V
    const cached = await this.cachedBook()
    if (cached && cached.v > ver && Array.isArray(cached.data)) {
      data = cached.data
      ver = cached.v
    }
    if (this.book.key === 'covenant') this.migrateLegacy(bundled)
    this.adoptLayout(data, ver)
    this.data = data
    this.resolveReady()
    this.emit()
    void this.checkBook()
  }

  private adoptLayout(data: Part[], ver: number) {
    const lay = layoutOf(data), cur = this.ld('bookV', 0)
    if (cur !== ver) this.migrateLocal(this.ld<Layout | null>('bookLay', null) || this.bundledLay, lay)
    this.bookV = ver
    this.bookLay = lay
    this.maps = layMaps(lay)
    this.sv('bookV', ver)
    this.sv('bookLay', lay)
  }

  private migrateLocal(from: Layout, to: Layout) {
    const b = remapBlob(this.localBlob(), from, to), A = layMaps(from), B = layMaps(to)
    this.sv('prayed', b.prayed); this.sv('fav', b.fav); this.sv('bookmarks', b.bm); this.sv('plan', b.plan)
    this.sv('ink', b.ink); this.sv('hist', b.hist); this.sv('last', b.last)
    const lp = this.ld<{ pid: string } | null>('lastP', null)
    if (lp) this.sv('lastP', B.up[A.pu[lp.pid]] ? { ...lp, pid: B.up[A.pu[lp.pid]] } : null)
    const ls = this.ld<{ sid: string; i: number } | null>('lastSess', null)
    if (ls) {
      const sid = B.us[A.su[ls.sid]]
      if (sid) {
        const [, p, s] = sid.split('-').map(Number)
        this.sv('lastSess', { ...ls, sid, i: Math.min(ls.i, to[p - 1].s[s - 1].p.length - 1) })
      } else this.sv('lastSess', null)
    }
  }

  // Layout v1/v2 → v3 for Covenant progress saved before sections were renumbered (design: migrate()).
  private migrateLegacy(data: Part[]) {
    const ver = this.ld('layout', 1)
    if (ver >= 3) return
    const key = ver === 1 ? 'o' : 'o2'
    const map: Record<string, string> = {}, secMap: Record<string, string> = {}, oldCount: Record<string, number> = {}
    const oneToOne: Record<string, string> = {}, partTo: Record<number, Set<number>> = {}, newPartFrom: Record<number, Set<number>> = {}
    data.forEach((p, pi) =>
      p.sections.forEach((s, si) => {
        const nsid = `s-${pi + 1}-${si + 1}`, srcs = new Set<string>()
        s.prayers.forEach((pr, i) => {
          const oid = (pr as unknown as Record<string, string>)[key]
          if (!oid) return
          map[oid] = `${nsid}-${i + 1}`
          const os = oid.replace(/-\d+$/, ''), op = +oid.split('-')[1]
          srcs.add(os)
          oldCount[os] = (oldCount[os] || 0) + 1
          if (!(os in secMap)) secMap[os] = nsid
          ;(partTo[op] = partTo[op] || new Set()).add(pi + 1)
          ;(newPartFrom[pi + 1] = newPartFrom[pi + 1] || new Set()).add(op)
        })
        if (srcs.size === 1) oneToOne[nsid] = [...srcs][0]
      }),
    )
    const partMap: Record<number, number> = {}
    Object.keys(partTo).forEach((op) => {
      const t = [...partTo[+op]]
      if (t.length === 1 && newPartFrom[t[0]].size === 1) partMap[+op] = t[0]
    })
    const inv: Record<string, string> = {}
    Object.keys(oneToOne).forEach((n) => {
      const o = oneToOne[n]
      const nCount = data[+n.split('-')[1] - 1].sections[+n.split('-')[2] - 1].prayers.length
      if (nCount === oldCount[o]) inv[o] = n
    })
    const remap = (o: Record<string, unknown>) => {
      const r: Record<string, unknown> = {}
      Object.keys(o || {}).forEach((k) => { if (map[k]) r[map[k]] = o[k] })
      return r
    }
    this.sv('prayed', remap(this.ld('prayed', {})))
    this.sv('fav', remap(this.ld('fav', {})))
    const bm: Record<string, unknown> = {}
    Object.entries(this.ld<Record<string, unknown>>('bookmarks', {})).forEach(([k, v]) => { if (secMap[k]) bm[secMap[k]] = v })
    this.sv('bookmarks', bm)
    const ink: Record<string, unknown> = {}
    Object.entries(this.ld<Record<string, unknown>>('ink', {})).forEach(([k, v]) => {
      if (k === 'title' || k === 'contents') ink[k] = v
      else if (/^part-\d+$/.test(k)) { const n = +k.slice(5); if (partMap[n]) ink[`part-${partMap[n]}`] = v }
      else if (inv[k]) ink[inv[k]] = v
    })
    this.sv('ink', ink)
    const last = this.ld<string | null>('last', null)
    this.sv('last', last && secMap[last] ? secMap[last] : null)
    const plan = this.ld<Record<string, unknown> | null>('plan', null)
    if (plan) {
      plan.today = null
      if (Array.isArray(plan.parts)) plan.parts = [...new Set((plan.parts as number[]).flatMap((n) => (partTo[n] ? [...partTo[n]] : [])))].sort((a, b) => a - b)
      if (plan.scope === 'parts' && !(plan.parts as number[]).length) plan.scope = 'all'
      this.sv('plan', plan)
    }
    this.sv('layout', 3)
  }

  private cacheKey() { return this.book.key === 'covenant' ? 'book.json' : `${this.book.key}.json` }
  private async cachedBook(): Promise<{ v: number; data: Part[] } | null> {
    try {
      const r = await (await caches.open('gra-book')).match(this.cacheKey())
      return r ? await r.json() : null
    } catch {
      return null
    }
  }
  private async saveCachedBook(b: { v: number; data: Part[] }) {
    try {
      await (await caches.open('gra-book')).put(this.cacheKey(), new Response(JSON.stringify(b), { headers: { 'Content-Type': 'application/json' } }))
    } catch {
      // Cache Storage unavailable: the edition is fetched again next time.
    }
  }
  private vq(sel: string) {
    const q = this.sb.from(this.book.verTable).select(sel)
    return this.book.verTable === 'lib_versions' ? q.eq('book', this.book.key) : q
  }

  // Apply a newer edition published from the Admin Console.
  async checkBook() {
    if (navigator.onLine === false || !this.data.length || this.checking) return
    this.checking = true
    try {
      const { data: top } = await this.vq('version').order('version', { ascending: false }).limit(1).maybeSingle<{ version: number }>()
      if (top && top.version > this.bookV) {
        const { data: row } = await this.vq('version, data').eq('version', top.version).single<{ version: number; data: Part[] }>()
        if (row && Array.isArray(row.data)) {
          await this.saveCachedBook({ v: row.version, data: row.data })
          this.adoptLayout(row.data, row.version)
          this.data = row.data
          this.emit()
          this.onToast('The book has been updated')
        }
      }
    } catch {
      // offline or no access: keep the current edition
    }
    this.checking = false
  }

  private async normRemote(d: Blob): Promise<Blob> {
    if (!d) return d
    const bv = d.bv || 0
    if (bv > this.bookV) await this.checkBook()
    if (bv === this.bookV) return d
    let from: Layout | null = bv === 0 ? this.bundledLay : null
    if (!from) {
      const { data } = await this.vq('layout').eq('version', bv).maybeSingle<{ layout: Layout }>()
      from = data?.layout ?? null
    }
    if (!from) throw new Error('layout')
    return { ...remapBlob(d, from, this.bookLay), bv: this.bookV }
  }

  // ---- account sync ----
  setUser(user: User | null) {
    const prev = this.user?.id
    this.user = user
    if (!user) {
      this.sync = null
      this.emit()
    } else if (prev !== user.id) void this.pull()
  }

  localBlob(): Blob {
    return {
      v: 3, bv: this.bookV || 0, reset: this.ld('resetAt', null), prayed: this.ld('prayed', {}), fav: this.ld('fav', {}),
      bm: this.ld('bookmarks', {}), plan: this.ld('plan', null), ink: this.ld('ink', {}), last: this.ld('last', null), hist: this.ld('hist', {}),
    }
  }

  private applyRemote(d: Partial<Blob>) {
    this.applying = true
    this.sv('prayed', d.prayed || {}); this.sv('fav', d.fav || {}); this.sv('bookmarks', d.bm || {}); this.sv('plan', d.plan || null)
    this.sv('ink', d.ink || {})
    if (d.last) this.sv('last', d.last)
    this.sv('hist', d.hist || this.ld('hist', {}))
    this.applying = false
    this.emit()
  }

  private setSync(s: SyncState) {
    this.sync = s
    if (s === 'ok') this.syncAt = Date.now()
    this.emit()
  }
  private syncFail(error: unknown) {
    const msg = (error as Error)?.message || ''
    this.setSync(navigator.onLine === false || /fetch|network/i.test(msg) ? 'offline' : 'error')
  }

  private stSel() {
    const q = this.sb.from(this.book.table).select('data, updated_at').eq('user_id', this.user!.id)
    return (this.book.table === 'library_state' ? q.eq('book', this.book.key) : q).maybeSingle<Row>()
  }
  private stUp(blob: Blob) {
    const lib = this.book.table === 'library_state'
    const row: Record<string, unknown> = { user_id: this.user!.id, data: blob }
    if (lib) row.book = this.book.key
    return this.sb.from(this.book.table).upsert(row, lib ? { onConflict: 'user_id,book' } : undefined).select('updated_at').single<{ updated_at: string }>()
  }

  async pull(): Promise<unknown> {
    if (!this.user || this.pushing) return
    await this.ready
    this.setSync('syncing')
    const { data, error } = await this.stSel()
    if (error) return this.syncFail(error)
    if (data) {
      try {
        data.data = await this.normRemote(data.data)
      } catch (e) {
        return this.syncFail(e)
      }
    }
    if (data?.data?.reset && data.data.reset !== this.ld('resetAt', null)) {
      this.sv('resetAt', data.data.reset); this.sv('lastP', null); this.sv('lastSess', null)
      this.applyRemote({ ...data.data, hist: {}, ink: {} })
      this.sv('syncMeta', { uid: this.user.id, at: data.updated_at })
      this.onToast('Your progress was reset by an admin')
      return this.push()
    }
    const meta = this.ld<Meta>('syncMeta', null), dirty = !!this.ld('dirty', 0), known = meta && meta.uid === this.user.id
    if (!data) return this.push()
    if (!known || (dirty && data.updated_at !== meta!.at)) {
      this.applyRemote(mergeData(this.localBlob(), data.data))
      return this.push()
    }
    if (data.updated_at !== meta!.at) {
      this.applyRemote(data.data)
      this.sv('syncMeta', { uid: this.user.id, at: data.updated_at })
    }
    if (dirty) return this.push()
    this.setSync('ok')
  }

  async push(): Promise<boolean> {
    clearTimeout(this.pushTimer)
    if (!this.user) return false
    if (this.pushing) {
      this.again = true
      return false
    }
    await this.ready
    this.pushing = true
    this.again = false
    this.setSync('syncing')
    try {
      const meta = this.ld<Meta>('syncMeta', null)
      const cur = await this.stSel()
      if (cur.error) throw cur.error
      if (cur.data) cur.data.data = await this.normRemote(cur.data.data)
      if (cur.data?.data?.reset && cur.data.data.reset !== this.ld('resetAt', null)) {
        this.pushing = false
        this.sv('syncMeta', null)
        await this.pull()
        return false
      }
      if (cur.data && (!meta || meta.uid !== this.user.id || cur.data.updated_at !== meta.at)) this.applyRemote(mergeData(this.localBlob(), cur.data.data))
      const { data, error } = await this.stUp(this.localBlob())
      if (error) throw error
      this.sv('syncMeta', { uid: this.user.id, at: data.updated_at })
      this.pushing = false
      if (this.again) {
        this.again = false
        return this.push()
      }
      remove(keyFor(this.book.key, 'dirty'))
      this.setSync('ok')
      return true
    } catch (e) {
      this.pushing = false
      this.syncFail(e)
      return false
    }
  }

  private markDirty() {
    save(keyFor(this.book.key, 'dirty'), 1)
    if (this.pushing) {
      this.again = true
      return
    }
    clearTimeout(this.pushTimer)
    this.pushTimer = setTimeout(() => void this.push(), 2500)
  }

  hasUnsynced() { return !!this.ld('dirty', 0) }

  // ---- anonymous usage counts (Admin Console insights) ----
  logUse(kind: 'pray' | 'open', refs: string[]) {
    if (!this.book.usage || load<{ usage?: boolean }>('gra-covenant-settings', {}).usage === false) return
    const m = this.maps, f = m ? (kind === 'pray' ? m.pu : m.su) : null
    const q = this.ld<Record<string, number>>('uq', {}), t = dayKey()
    refs.map((r) => f?.[r] || r).forEach((r) => {
      const k = `${t}|${kind}|${r}`
      q[k] = (q[k] || 0) + 1
    })
    this.sv('uq', q)
    clearTimeout(this.useTimer)
    this.useTimer = setTimeout(() => void this.flushUse(), 60000)
  }

  async flushUse() {
    if (this.flushing || navigator.onLine === false) return
    const q = this.ld<Record<string, number>>('uq', {}), keys = Object.keys(q).slice(0, 400)
    if (!keys.length) return
    if (load<{ usage?: boolean }>('gra-covenant-settings', {}).usage === false) return remove('gra-covenant-uq')
    this.flushing = true
    try {
      const events = keys.map((k) => {
        const [d, kk, r] = k.split('|')
        return { d, k: kk, r, n: Math.min(100, q[k]) }
      })
      const { error } = await this.sb.rpc('log_usage', { events })
      if (!error) {
        const q2 = this.ld<Record<string, number>>('uq', {})
        keys.forEach((k) => {
          q2[k] = (q2[k] || 0) - q[k]
          if (q2[k] <= 0) delete q2[k]
        })
        this.sv('uq', q2)
      }
    } catch {
      // retried on the next flush
    }
    this.flushing = false
  }
}
