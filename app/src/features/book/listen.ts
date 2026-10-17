import type { Settings } from '../../lib/settings.ts'
import { Speaker } from '../../lib/speech.ts'
import type { BookKey } from './books.ts'
import type { Part, Scripture } from './types.ts'

// Read aloud ("Listen"), ported from design/src/book/app.js (ttsItems, ttsStart, ttsPlay,
// ttsAdvance, ttsStep, ttsPause, ttsStop, sleepCycle, mediaSet).

export type ListenItem = { pid: string | null; kicker: string; text: string }
export type Queue = { sid: string; title: string; items: ListenItem[] }

const versesOf = (sc: Scripture) => `${sc.ref}. ${sc.verses.map((v) => v.text).join(' ')}`
const skip = (key: BookKey, s: Part['sections'][number]) => s.kind === 'list' || (key === 'jcfp' && s.prayers.some((x) => x.link === 'weekly'))

// What gets read for a section (`s-p-s`) or a whole JCFP watch (`part-n`).
export function listenItems(key: BookKey, data: Part[], sid: string, withVerses: boolean): Queue {
  const extra = (sc: Scripture[]) => (withVerses && sc.length ? ' ' + sc.map(versesOf).join(' ') : '')
  if (sid.startsWith('part-')) {
    const pn = Number(sid.split('-')[1]), P = data[pn - 1], label = P.label || `Part ${pn}`
    const all: { pid: string; text: string; scripture: Scripture[] }[] = []
    P.sections.forEach((s, si) => {
      if (skip(key, s)) return
      s.prayers.forEach((pr, i) => all.push({ pid: `s-${pn}-${si + 1}-${i + 1}`, text: pr.text, scripture: pr.scripture }))
    })
    return {
      sid,
      title: P.label || P.title,
      items: all.map((x, k) => ({ pid: x.pid, kicker: `${label} · Prayer ${k + 1} of ${all.length}`, text: `Prayer ${k + 1}. ${x.text}${extra(x.scripture)}` })),
    }
  }
  const [, pn, sn] = sid.split('-').map(Number), s = data[pn - 1].sections[sn - 1]
  const items: ListenItem[] = []
  if (s.foundation.length) items.push({ pid: null, kicker: `${pn}.${sn} · Scripture foundation`, text: `${s.title}. Scripture foundation. ${s.foundation.map(versesOf).join(' ')}` })
  s.prayers.forEach((pr, i) =>
    items.push({ pid: `${sid}-${i + 1}`, kicker: `${pn}.${sn} · Prayer ${i + 1} of ${s.prayers.length}`, text: `Prayer ${i + 1}. ${pr.text}${extra(pr.scripture)}` }),
  )
  return { sid, title: s.title, items }
}

// Section ids in reading order (design: indexBook → flat).
export function sectionOrder(key: BookKey, data: Part[]): string[] {
  return data.flatMap((p, pi) => p.sections.flatMap((s, si) => (key === 'jcfp' && s.prayers.some((x) => x.link === 'weekly') ? [] : [`s-${pi + 1}-${si + 1}`])))
}

export type Sleep = null | { mode: 15 | 30 | 60; end: number } | { mode: 'sec' }
export type ListenState = { sid: string; pid: string | null; i: number; playing: boolean } | null

type Deps = {
  key: BookKey
  title: string
  data: () => Part[]
  isPrayed: (pid: string) => boolean
  markPrayed: (pid: string) => void
  logOpen: (sid: string) => void
  toast: (t: string) => void
  scrollTo: (id: string) => void
}

export class Listener {
  state: ListenState = null
  sleep: Sleep = null
  queue: Queue | null = null
  version = 0
  private speaker = new Speaker()
  private sleepTimer?: ReturnType<typeof setTimeout>
  private gapTimer?: ReturnType<typeof setTimeout>
  private listeners = new Set<() => void>()
  private mediaInit = false
  private deps: Deps
  private settings: Settings

  constructor(deps: Deps, settings: Settings) {
    this.deps = deps
    this.settings = settings
  }

  // The reader passes in the latest settings (rate, voice, gap, …) whenever they change.
  setSettings(st: Settings) {
    this.settings = st
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() {
    this.version++
    this.listeners.forEach((f) => f())
  }

  start(sid: string, pid?: string) {
    const q = listenItems(this.deps.key, this.deps.data(), sid, this.settings.ttsVerses)
    this.queue = q
    this.play(pid ? Math.max(0, q.items.findIndex((x) => x.pid === pid)) : 0)
    this.deps.logOpen(sid)
  }

  play(i: number) {
    const q = this.queue
    if (!q) return
    clearTimeout(this.gapTimer)
    const it = q.items[i]
    if (!it) return this.advance()
    this.state = { sid: q.sid, pid: it.pid, i, playing: true }
    this.emit()
    this.media()
    this.deps.scrollTo(it.pid || q.sid)
    const st = this.settings
    this.speaker.speak(it.text, { rate: st.rate, voice: st.voice }, () => {
      if (st.ttsMark !== false && it.pid && !this.deps.isPrayed(it.pid)) this.deps.markPrayed(it.pid)
      const tok = this.speaker.token, g = (st.ttsGap || 0) * 1000
      if (g) this.gapTimer = setTimeout(() => this.speaker.isCurrent(tok) && this.play(i + 1), g)
      else this.play(i + 1)
    })
  }

  private advance() {
    if (this.sleep?.mode === 'sec') {
      this.sleep = null
      this.stop()
      return this.deps.toast('Sleep timer: finished this section')
    }
    const order = sectionOrder(this.deps.key, this.deps.data()), idx = this.queue ? order.indexOf(this.queue.sid) : -1, nx = idx >= 0 ? order[idx + 1] : undefined
    if (nx) {
      this.queue = listenItems(this.deps.key, this.deps.data(), nx, this.settings.ttsVerses)
      this.play(0)
    } else {
      this.stop()
      this.deps.toast('Finished reading the book')
    }
  }

  pause() {
    this.speaker.cancel()
    clearTimeout(this.gapTimer)
    this.setMedia('paused')
    if (this.state) this.state = { ...this.state, playing: false }
    this.emit()
  }

  toggle() {
    if (this.state?.playing) this.pause()
    else this.play(this.state?.i ?? 0)
  }

  step(d: number) {
    if (!this.queue || !this.state) return
    const i = this.state.i + d
    if (i < 0) {
      const order = sectionOrder(this.deps.key, this.deps.data()), pv = order[order.indexOf(this.queue.sid) - 1]
      if (pv) {
        this.queue = listenItems(this.deps.key, this.deps.data(), pv, this.settings.ttsVerses)
        this.play(this.queue.items.length - 1)
      } else this.play(0)
      return
    }
    if (i >= this.queue.items.length) return this.advance()
    this.play(i)
  }

  stop() {
    this.speaker.cancel()
    clearTimeout(this.gapTimer)
    clearTimeout(this.sleepTimer)
    this.queue = null
    this.state = null
    this.sleep = null
    this.setMedia('none')
    this.emit()
  }

  // Off → 15 → 30 → 60 minutes → end of this section → off.
  cycleSleep() {
    const order: (null | 15 | 30 | 60 | 'sec')[] = [null, 15, 30, 60, 'sec']
    const cur = this.sleep ? this.sleep.mode : null, nx = order[(order.indexOf(cur) + 1) % order.length]
    clearTimeout(this.sleepTimer)
    if (!nx) {
      this.sleep = null
      this.deps.toast('Sleep timer off')
    } else if (nx === 'sec') {
      this.sleep = { mode: 'sec' }
      this.deps.toast('Stops at the end of this section')
    } else {
      this.sleep = { mode: nx, end: Date.now() + nx * 60000 }
      this.deps.toast(`Sleep timer: ${nx} minutes`)
      this.sleepTimer = setTimeout(() => {
        this.sleep = null
        if (this.state?.playing) this.pause()
        this.deps.toast('Sleep timer ended')
        this.emit()
      }, nx * 60000)
    }
    this.emit()
  }

  // Lock-screen / headphone controls.
  private media() {
    const ms = navigator.mediaSession
    if (!ms || !this.queue || !this.state) return
    try {
      const it = this.queue.items[this.state.i]
      ms.metadata = new MediaMetadata({
        title: this.queue.title,
        artist: (it?.kicker ? it.kicker + ' · ' : '') + this.deps.title,
        album: 'Overcomer’s Library',
        artwork: [{ src: new URL('icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }],
      })
      ms.playbackState = 'playing'
      if (!this.mediaInit) {
        this.mediaInit = true
        const h = (a: MediaSessionAction, f: () => void) => {
          try {
            ms.setActionHandler(a, f)
          } catch {
            // action not supported
          }
        }
        h('play', () => this.play(this.state?.i ?? 0))
        h('pause', () => this.pause())
        h('previoustrack', () => this.step(-1))
        h('nexttrack', () => this.step(1))
        h('stop', () => this.stop())
      }
    } catch {
      // MediaSession unavailable
    }
  }
  private setMedia(state: MediaSessionPlaybackState) {
    try {
      if (navigator.mediaSession) navigator.mediaSession.playbackState = state
    } catch {
      // MediaSession unavailable
    }
  }
}
