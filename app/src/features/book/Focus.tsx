import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useSettings } from '../../lib/settings.ts'
import { beep, unlock } from '../../lib/sound.ts'
import { Speaker, ttsSupported } from '../../lib/speech.ts'
import type { BookKey } from './books.ts'
import { sectionOrder } from './listen.ts'
import { timer } from './focusTimer.ts'
import Logo from './Logo.tsx'
import type { BookStore } from './store.ts'
import type { Part, Prayer, Scripture } from './types.ts'

// Focused Mode: one prayer at a time, full screen, with an optional per-prayer timer and
// read-aloud. Ported from design/src/book/app.js (sessOpen, sessMove, sessResetTimer,
// sessSpeak, sessVals, sessTimerVals) and the `sessOn` overlay in template.html.

export type FocusStart = { sid: string; i?: number }
type Sess = { sid: string; i: number; count: number; done: boolean }
type Props = {
  bookKey: BookKey
  data: Part[]
  store: BookStore
  weekly: Prayer[] // this week's prayers, for the JCFP weekly section (sid 'wk')
  start: FocusStart
  onClose: (lastPrayerId: string | null) => void
  toast: (t: string) => void
}

const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const PRESETS = [0, 30, 60, 120, 180, 300, 600, 900]
const presetLabel = (s: number) => (!s ? 'Off' : s < 60 ? `${s}s` : s % 60 ? mm(s) : `${s / 60}m`)

export default function Focus({ bookKey, data, store, weekly, start, onClose, toast }: Props) {
  const { settings: st, set } = useSettings()
  const order = sectionOrder(bookKey, data)
  const sectionOf = useCallback(
    (sid: string): { title: string; prayers: Prayer[] } => {
      if (sid === 'wk') return { title: 'GRA Weekly Kingdom Prayers', prayers: weekly }
      const [, p, s] = sid.split('-').map(Number)
      return data[p - 1].sections[s - 1]
    },
    [data, weekly],
  )

  const firstUnprayed = () => {
    if (start.i != null) return start.i
    const i = sectionOf(start.sid).prayers.findIndex((_, k) => !store.prayed[`${start.sid}-${k + 1}`])
    return i < 0 ? 0 : i
  }
  const [sess, setSess] = useState<Sess>(() => ({ sid: start.sid, i: firstUnprayed(), count: 0, done: false }))
  const [tm, dispatch] = useReducer(timer, { dur: 0, left: 0, run: 'stopped' })
  const { dur, left, run } = tm
  const [timerOpen, setTimerOpen] = useState(false)
  const [reading, setReading] = useState(false)
  const [speaker] = useState(() => new Speaker())
  const bodyRef = useRef<HTMLDivElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  // Opening: remember the place, count the open, lock scrolling, keep the screen awake.
  useEffect(() => {
    if (start.sid !== 'wk') {
      store.sv('lastSess', { sid: start.sid, i: sess.i, t: Date.now() })
      store.logUse('open', [start.sid])
    }
    document.body.style.overflow = 'hidden'
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => (lock = l), () => {})
    return () => {
      document.body.style.overflow = ''
      void lock?.release()
      speaker.cancel()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- runs once per session

  // The session only changes through move(), so the ref always holds the current one.
  const sessRef = useRef(sess)
  const move = useCallback(
    (d: number) => {
      const ss = sessRef.current
      if (ss.done) return
      let { sid, i, count } = ss
      let next: Sess
      const sec = sectionOf(sid)
      if (sid === 'wk') {
        if (d > 0) {
          count++
          i++
        } else i = Math.max(0, i - 1)
        next = i >= sec.prayers.length ? { ...ss, count, done: true } : { sid, i, count, done: false }
      } else {
        const idx = order.indexOf(sid)
        let done = false
        if (d > 0) {
          const pid = `${sid}-${i + 1}`
          if (!store.prayed[pid]) store.setMany([pid], true)
          count++
          i++
          if (i >= sec.prayers.length) {
            // Next section that has prayers (prayer lists have none).
            let k = idx + 1
            while (k < order.length && !sectionOf(order[k]).prayers.length) k++
            if (k >= order.length) done = true
            else {
              if (bookKey !== 'jcfp') toast(`Section ${sid.split('-').slice(1).join('.')} complete`)
              sid = order[k]
              i = 0
            }
          }
        } else {
          i--
          if (i < 0) {
            let k = idx - 1
            while (k >= 0 && !sectionOf(order[k]).prayers.length) k--
            if (k >= 0) {
              sid = order[k]
              i = sectionOf(sid).prayers.length - 1
            } else i = 0
          }
        }
        next = done ? { ...ss, count, done: true } : { sid, i, count, done: false }
        store.sv('lastSess', done ? null : { sid, i, t: Date.now() })
      }
      sessRef.current = next
      setSess(next)
      dispatch({ type: next.done ? 'end' : 'prayer' })
      bodyRef.current?.scrollTo(0, 0)
    },
    [bookKey, order, sectionOf, store, toast],
  )

  // Countdown: ticks for the last 3 seconds, a chime at zero, then the next prayer
  // (or "Time's up" when auto-advance is off). Latest values are read through a ref.
  const live = useRef({ left, sessChime: st.sessChime, sessAuto: st.sessAuto, move })
  useEffect(() => {
    live.current = { left, sessChime: st.sessChime, sessAuto: st.sessAuto, move }
  })
  useEffect(() => {
    if (run !== 'running') return
    const t = setInterval(() => {
      const { left: l, sessChime, sessAuto, move: next } = live.current
      if (l - 1 > 0) {
        if (sessChime && l - 1 <= 3) beep(false)
        dispatch({ type: 'tick' })
        return
      }
      if (sessChime) beep(true)
      if (sessAuto) next(1)
      else dispatch({ type: 'up' })
    }, 1000)
    return () => clearInterval(t)
  }, [run])

  // Read each prayer aloud, then go on to the next one.
  useEffect(() => {
    if (!reading || sess.done) return
    const pr = sectionOf(sess.sid).prayers[sess.i]
    if (!pr) return
    const verses = (sc: Scripture) => `${sc.ref}. ${sc.verses.map((v) => v.text).join(' ')}`
    const text = pr.text + (st.ttsVerses && pr.scripture.length ? ' ' + pr.scripture.map(verses).join(' ') : '')
    let t: ReturnType<typeof setTimeout>
    speaker.speak(text, { rate: st.rate, voice: st.voice }, () => {
      t = setTimeout(() => move(1), (st.ttsGap || 0) * 1000 + 700)
    })
    return () => {
      clearTimeout(t)
      speaker.cancel()
    }
  }, [reading, sess.sid, sess.i, sess.done]) // eslint-disable-line react-hooks/exhaustive-deps -- speak once per prayer

  const close = useCallback(() => {
    speaker.cancel()
    onClose(sess.done ? null : `${sess.sid}-${sess.i + 1}`)
  }, [onClose, sess, speaker])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && e.target === document.body)) {
        e.preventDefault()
        move(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        move(-1)
      } else if (e.key === 'Escape') close()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [move, close])

  const setDuration = (sec: number) => dispatch({ type: 'dur', sec })
  const playPause = () => {
    if (dur && run !== 'running') unlock()
    dispatch({ type: 'playPause' })
  }
  const reset = () => dispatch({ type: 'reset' })
  const stopTimer = () => dispatch({ type: 'stop' })

  // Header and progress.
  const sec = sectionOf(sess.sid), pr = sec.prayers[sess.i]
  let kicker = 'Focused Mode complete', pct = '100%'
  if (!sess.done && pr) {
    if (sess.sid === 'wk') {
      kicker = `Weekly Kingdom Prayers · ${sess.i + 1} of ${sec.prayers.length}`
      pct = `${((sess.i + 1) / sec.prayers.length) * 100}%`
    } else {
      const [, p, s] = sess.sid.split('-').map(Number)
      kicker = bookKey === 'jcfp' ? jcfpPos(data, p, s, sess.i) : `${p}.${s} · Prayer ${sess.i + 1} of ${sec.prayers.length}`
      const pos = order.indexOf(sess.sid)
      pct = `${((pos + (sess.i + 1) / sec.prayers.length) / order.length) * 100}%`
    }
  }
  const showScripture = !!pr && pr.scripture.length > 0 && (sess.sid === 'wk' || st.verses)
  const playing = run === 'running'
  const timerLabel = dur ? mm(run === 'stopped' ? dur : left) : 'Timer'
  const stateLabel = !dur ? 'Off' : { running: 'Running', paused: 'Paused', stopped: 'Ready. Tap Start', done: 'Time’s up' }[run]

  return (
    <div
      className="focus"
      role="dialog"
      aria-label="Focused Mode"
      onTouchStart={(e) => (swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s0 = swipe.current
        if (!s0) return
        swipe.current = null
        const dx = e.changedTouches[0].clientX - s0.x, dy = e.changedTouches[0].clientY - s0.y
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1)
      }}
    >
      <div className="focus-track">
        <div className="focus-fill" style={{ width: pct }} />
      </div>
      <div className="focus-bar">
        <button className="icon-btn" onClick={close} aria-label="End session">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="focus-kicker">{kicker}</div>
        <div className="focus-tools">
          {dur > 0 && !sess.done && (
            <button className="focus-pp" onClick={playPause} aria-label={playing ? 'Pause timer' : 'Start timer'}>
              {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>
          )}
          {ttsSupported() && (
            <button
              className={reading ? 'focus-read on' : 'focus-read'}
              onClick={() => setReading(!reading)}
              aria-pressed={reading}
              aria-label={reading ? 'Stop reading aloud' : 'Read each prayer aloud'}
              title={reading ? 'Stop reading aloud' : 'Read each prayer aloud'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
                <path d="M16 9a5 5 0 0 1 0 6" />
                <path d="M19.4 18.4a9 9 0 0 0 0-12.8" />
              </svg>
            </button>
          )}
          <button className={dur ? 'focus-timer on' : 'focus-timer'} onClick={() => setTimerOpen(!timerOpen)} aria-label="Prayer timer" aria-expanded={timerOpen} title="Prayer timer">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" x2="14" y1="2" y2="2" />
              <line x1="12" x2="15" y1="14" y2="11" />
              <circle cx="12" cy="14" r="8" />
            </svg>
            <span>{timerLabel}</span>
          </button>
          {timerOpen && (
            <div className="timer-pop" role="dialog" aria-label="Timer settings" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
              <div className="timer-head">
                <span className="setting-label">Time per prayer</span>
                <span className="muted">{stateLabel}</span>
              </div>
              <div className="timer-presets">
                {PRESETS.map((v) => (
                  <button key={v} className={dur === v ? 'preset on' : 'preset'} onClick={() => setDuration(v)}>
                    {presetLabel(v)}
                  </button>
                ))}
              </div>
              <div className="timer-adjust">
                <button onClick={() => setDuration(dur - 60 < 15 && dur > 15 ? 15 : dur - 60)} aria-label="Subtract 1 minute">−1m</button>
                <button onClick={() => setDuration(dur - 15)} aria-label="Subtract 15 seconds">−15s</button>
                <div className="timer-dur">{dur ? mm(dur) : '0:00'}</div>
                <button onClick={() => setDuration(dur + 15)} aria-label="Add 15 seconds">+15s</button>
                <button onClick={() => setDuration(dur + 60)} aria-label="Add 1 minute">+1m</button>
              </div>
              <div className="timer-actions">
                <button className="btn btn-primary" onClick={playPause} disabled={!dur}>
                  {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                  <span>{playing ? 'Pause' : run === 'paused' ? 'Resume' : 'Start'}</span>
                </button>
                <button className="btn btn-secondary" onClick={reset} disabled={!dur}>
                  Reset
                </button>
                <button className="btn btn-secondary" onClick={stopTimer} disabled={!dur || run === 'stopped'}>
                  Stop
                </button>
              </div>
              <CheckRow on={st.sessAuto} onClick={() => set({ sessAuto: !st.sessAuto })}>
                Go to the next prayer when time is up
              </CheckRow>
              <CheckRow
                on={st.sessChime}
                onClick={() => {
                  if (!st.sessChime) unlock()
                  set({ sessChime: !st.sessChime })
                }}
                tight
              >
                Chime for the last 3 seconds
              </CheckRow>
            </div>
          )}
        </div>
      </div>
      {timerOpen && <div className="timer-scrim" aria-hidden="true" onClick={() => setTimerOpen(false)} />}

      <div className="focus-body" ref={bodyRef}>
        {!sess.done && pr ? (
          <div className="focus-prayer">
            <div className="focus-title">{sec.title}</div>
            <p className="focus-text">{pr.text}</p>
            {showScripture && (
              <div className="focus-scripture">
                {pr.scripture.map((sc, k) => (
                  <div key={k}>
                    <span className="focus-ref">{sc.ref}</span>
                    <span className="verse-text">
                      {sc.verses.map((v, j) => (
                        <span key={j}>
                          {' '}
                          {v.n && <sup>{v.n}</sup>}
                          {v.text}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="focus-done">
            <Logo kind="mark" className="focus-done-mark" />
            <div className="focus-amen">Amen.</div>
            <p>You’ve prayed through to the end of the book.</p>
            <button className="btn btn-primary" onClick={close}>
              Close
            </button>
          </div>
        )}
      </div>

      {!sess.done && (
        <div className="focus-nav">
          <button className="focus-prev" onClick={() => move(-1)} aria-label="Previous prayer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button className="btn btn-primary focus-next" onClick={() => move(1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>Amen · Next</span>
          </button>
          <div className="focus-count">
            {sess.count}
            <br />
            prayed
          </div>
        </div>
      )}
    </div>
  )
}

// JCFP counts prayers through the whole watch (design: jcfpPos).
function jcfpPos(data: Part[], p: number, s: number, i: number) {
  const P = data[p - 1]
  let k = 0, N = 0
  P.sections.forEach((x, xi) => {
    if (x.kind === 'list' || x.prayers.some((y) => y.link === 'weekly')) return
    if (xi < s - 1) k += x.prayers.length
    N += x.prayers.length
  })
  return `${P.label || 'Watch ' + p} · Prayer ${k + i + 1} of ${N}`
}

function CheckRow({ on, onClick, tight, children }: { on: boolean; onClick: () => void; tight?: boolean; children: React.ReactNode }) {
  return (
    <button className={tight ? 'check-row tight' : 'check-row'} onClick={onClick} aria-pressed={on}>
      <span className={on ? 'check-box on' : 'check-box'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span>{children}</span>
    </button>
  )
}

const PlayIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="7 4 20 12 7 20 7 4" />
  </svg>
)
const PauseIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
)
