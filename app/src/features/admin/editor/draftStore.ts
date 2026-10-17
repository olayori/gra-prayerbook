import type { SupabaseClient } from '@supabase/supabase-js'
import { layoutOf } from '../../book/layout.ts'
import type { Part } from '../../book/types.ts'
import { clean, diff, ensureU, History, logChange, problems, stats, type Draft, type LogEntry } from './engine.ts'

// One book's draft in the Admin Console: loading, autosave with conflict detection,
// undo/redo, publishing and the version list (design/src/admin/app.js: loadBook, mut,
// save, publish, discardDraft, restoreVersion).

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'
export type Version = { version: number; note: string | null; stats: Record<string, number> | null; published_by_email: string | null; published_at: string }

const SAVE_DELAY = 1200
const RETRY_DELAY = 8000
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

export class DraftStore {
  draft: Draft | null = null
  pub: Draft = []
  pubV = 0
  versions: Version[] = []
  log: LogEntry[] = []
  save: SaveState = 'saved'
  conflict = false
  savedOnce = false
  version = 0
  readonly history = new History()
  private baseV = 0
  private draftAt: string | null = null
  private seq = 0
  private saving = false
  private timer?: ReturnType<typeof setTimeout>
  private listeners = new Set<() => void>()
  private sb: SupabaseClient
  readonly slug: string
  private me: string
  private keepExtras: boolean

  constructor(sb: SupabaseClient, slug: string, me: string, keepExtras: boolean) {
    this.sb = sb
    this.slug = slug
    this.me = me
    this.keepExtras = keepExtras
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() {
    this.version++
    this.listeners.forEach((f) => f())
  }

  // ---- loading ----
  async load() {
    const [ed, vs, dr] = await Promise.all([
      this.sb.rpc('get_edition', { p_slug: this.slug }),
      this.sb.from('book_editions').select('version, note, stats, published_by_email, published_at').eq('book_slug', this.slug).order('version', { ascending: false }),
      this.sb.rpc('get_draft', { p_slug: this.slug }),
    ])
    if (ed.error) throw ed.error
    if (vs.error) throw vs.error
    if (dr.error) throw dr.error
    this.pub = ensureU((ed.data?.data ?? []) as Part[])
    this.pubV = ed.data?.version ?? 0
    this.versions = (vs.data ?? []) as Version[]
    const d = dr.data as { data: Part[]; log: LogEntry[]; base_version: number; updated_at: string } | null
    this.draft = d ? ensureU(d.data) : clone(this.pub)
    this.log = d?.log ?? []
    this.baseV = d ? d.base_version : this.pubV
    this.draftAt = d?.updated_at ?? null
    this.history.clear()
    this.conflict = false
    this.save = 'saved'
    this.savedOnce = false
    this.emit()
  }

  async reload() {
    this.draft = null
    this.emit()
    await this.load()
  }

  // ---- editing ----
  get changes(): ReturnType<typeof diff> | { total: 0; st: null; flag: Record<string, 'New' | 'Edited' | 'Moved'>; secFlag: Record<string, boolean> } {
    return this.draft ? diff(this.pub, this.draft) : { total: 0, st: null, flag: {}, secFlag: {} }
  }
  get problems() {
    return this.draft ? problems(this.draft) : []
  }

  // what: the change-log line; key: joins quick repeated edits (e.g. typing in one prayer).
  edit(what: string, key: string | null, fn: (d: Draft) => Draft) {
    if (!this.draft) return
    this.history.push(this.draft, key ?? undefined)
    this.draft = fn(this.draft)
    this.log = logChange(this.log, { what, key, by: this.me })
    this.dirty()
  }

  undo() {
    const d = this.draft && this.history.undo(this.draft)
    if (d) this.replace(d, 'Undid a change')
  }
  redo() {
    const d = this.draft && this.history.redo(this.draft)
    if (d) this.replace(d, 'Redid a change')
  }
  private replace(d: Draft, what: string) {
    this.draft = d
    this.log = [...this.log, { t: Date.now(), by: this.me, what, key: null }]
    this.dirty()
  }

  discard() {
    if (!this.draft) return
    this.history.push(this.draft)
    this.history.breakChain()
    this.draft = clone(this.pub)
    this.log = [{ t: Date.now(), by: this.me, what: `Discarded changes, back to version ${this.pubV}`, key: null }]
    this.dirty()
  }

  // Put an earlier version into the draft (History tab).
  async restore(v: number) {
    const data = await this.versionData(v)
    this.edit(v ? `Restored version ${v}` : 'Restored the original book', null, () => data)
  }

  async versionData(v: number): Promise<Draft> {
    const { data, error } = await this.sb.from('book_editions').select('data').eq('book_slug', this.slug).eq('version', v).single<{ data: Part[] }>()
    if (error) throw error
    return ensureU(data.data)
  }

  // ---- saving ----
  private dirty() {
    this.seq++
    this.save = 'unsaved'
    this.emit()
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), SAVE_DELAY)
  }

  async flush() {
    clearTimeout(this.timer)
    if (this.conflict || !this.draft || this.save === 'saved') return
    if (this.saving) {
      this.timer = setTimeout(() => void this.flush(), 800)
      return
    }
    this.saving = true
    const seq = this.seq
    this.save = 'saving'
    this.emit()
    try {
      const { data, error } = await this.sb.rpc('save_draft', {
        p_slug: this.slug,
        p_data: this.draft,
        p_log: this.log.slice(-500),
        p_base_version: this.baseV,
        p_expected_at: this.draftAt,
      })
      if (error) throw error
      if (data.conflict) {
        this.conflict = true
        this.save = 'unsaved'
      } else {
        this.draftAt = data.updated_at
        this.savedOnce = true
        this.save = seq === this.seq ? 'saved' : 'unsaved'
        if (this.save === 'unsaved') this.timer = setTimeout(() => void this.flush(), SAVE_DELAY)
      }
    } catch {
      this.save = 'error'
      this.timer = setTimeout(() => void this.flush(), RETRY_DELAY)
    }
    this.saving = false
    this.emit()
  }

  // ---- publishing ----
  async publish(note: string): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
    if (!this.draft || this.problems.length) return { ok: false, error: '' }
    await this.flush()
    if (this.conflict) return { ok: false, error: '' }
    const data = clean(this.draft, this.keepExtras)
    const { data: v, error } = await this.sb.rpc('publish_edition', {
      p_slug: this.slug,
      p_note: note,
      p_data: data,
      p_layout: layoutOf(data),
      p_stats: stats(data, diff(this.pub, this.draft).st),
    })
    if (error) return { ok: false, error: `Couldn’t publish: ${error.message}` }
    const [dr, vs] = await Promise.all([
      this.sb.rpc('get_draft', { p_slug: this.slug }),
      this.sb.from('book_editions').select('version, note, stats, published_by_email, published_at').eq('book_slug', this.slug).order('version', { ascending: false }),
    ])
    this.draftAt = dr.data?.updated_at ?? null
    this.versions = (vs.data ?? this.versions) as Version[]
    this.log = []
    this.baseV = v as number
    this.history.clear()
    this.pub = ensureU(clone(data))
    this.pubV = v as number
    this.draft = ensureU(clone(data))
    this.save = 'saved'
    this.emit()
    return { ok: true, version: v as number }
  }

  stop() {
    clearTimeout(this.timer)
  }
}
