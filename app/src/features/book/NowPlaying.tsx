import { useRef, useState } from 'react'
import { useSettings } from '../../lib/settings.ts'
import { bestVoice } from '../../lib/speech.ts'
import type { BookKey } from './books.ts'
import type { Listener } from './listen.ts'

// The read-aloud player: a mini bar above the page and a full "Now playing" sheet
// (design: npVals/npBuild and the npMini / npOpen markup).
const COVER: Record<BookKey, [string, string, string]> = {
  covenant: ['#25685d', '#11372f', '#d9c27e'],
  jcfp: ['#8e2d3a', '#561620', '#dcb86c'],
}
const RATES = [0.8, 1, 1.2, 1.4]
const IC = {
  speed: 'M12 14l4-4M20 14a8 8 0 1 0-16 0',
  sleep: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  car: 'M5 17h14M6 17v2M18 17v2M3 13l2-6h14l2 6v4H3zM7 13h.01M17 13h.01',
  cast: 'M2 16a6 6 0 0 1 6 6M2 12a10 10 0 0 1 10 10M2 20h.01M6 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6',
}
const PLAY = 'M8 5v14l11-7z', PAUSE = 'M7 5h3v14H7zM14 5h3v14h-3z'
const wc = (t: string) => t.split(/\s+/).filter(Boolean).length
const fmt = (x: number) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`

export default function NowPlaying({ listener, bookKey, bookTitle, toast }: { listener: Listener; bookKey: BookKey; bookTitle: string; toast: (t: string) => void }) {
  const { settings: st, set } = useSettings()
  const [open, setOpen] = useState(false)
  const [drive, setDrive] = useState(false)
  const sheet = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y0: number; dy: number } | null>(null)
  const q = listener.queue, s = listener.state
  if (!q || !s || !q.items.length) return null

  // Progress by words read, at about 2.5 words a second.
  const items = q.items, i = Math.max(0, Math.min(items.length - 1, s.i)), it = items[i]
  const words = items.reduce((a, x) => a + wc(x.text), 0) || 1, done = items.slice(0, i).reduce((a, x) => a + wc(x.text), 0)
  const sec = (w: number) => Math.round(w / (2.5 * (st.rate || 1)))
  const frac = Math.min(1, done / words), pct = `${Math.round(frac * 1000) / 10}%`
  const [c1, c2, ink] = COVER[bookKey]
  const coverBg = `linear-gradient(105deg, rgba(255,255,255,.12), transparent 36%), radial-gradient(130% 95% at 30% 18%, ${c1}, ${c2} 72%)`
  const sleep = listener.sleep, sleepLabel = !sleep ? '' : sleep.mode === 'sec' ? 'End of section' : `${sleep.mode} min`
  const rateNext = () => {
    const n = RATES[(RATES.indexOf(st.rate || 1) + 1) % RATES.length]
    set({ rate: n })
    if (s.playing) setTimeout(() => listener.play(s.i), 30)
  }
  const stop = () => {
    setOpen(false)
    listener.stop()
  }
  const icon = s.playing ? PAUSE : PLAY, playLabel = s.playing ? 'Pause' : 'Play'

  if (!open)
    return (
      <div className="np-mini">
        <button className="np-mini-open" onClick={() => setOpen(true)} aria-label="Open player">
          <span className="np-mini-cover" style={{ background: coverBg, color: ink }} />
          <span className="np-mini-text">
            <span>{it.kicker}</span>
            <span className="muted">{q.title}</span>
          </span>
        </button>
        <button className="np-btn" onClick={() => listener.step(-1)} aria-label="Previous prayer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11 6v12l-8.5-6zM21 6v12l-8.5-6z" /></svg>
        </button>
        <button className="np-btn np-play" onClick={() => listener.toggle()} aria-label={playLabel}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={icon} /></svg>
        </button>
        <button className="np-btn" onClick={() => listener.step(1)} aria-label="Next prayer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 6v12l8.5-6zM3 6v12l8.5-6z" /></svg>
        </button>
        <button className="np-btn" onClick={stop} aria-label="Stop">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <span className="np-mini-progress" style={{ width: pct }} />
      </div>
    )

  // Swipe the sheet down to minimise it.
  const onTouchStart = (e: React.TouchEvent) => {
    if ((sheet.current?.scrollTop ?? 0) > 2) return
    drag.current = { y0: e.touches[0].clientY, dy: 0 }
    if (sheet.current) sheet.current.style.transition = 'none'
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !sheet.current) return
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y0)
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`
  }
  const onTouchEnd = () => {
    const d = drag.current, el = sheet.current
    drag.current = null
    if (!d || !el) return
    el.style.transition = 'transform .24s cubic-bezier(.2,.7,.2,1)'
    if (d.dy > 80) {
      el.style.transform = 'translateY(100%)'
      setTimeout(() => setOpen(false), 200)
    } else el.style.transform = ''
  }

  const voice = bestVoice(st.voice)?.name ?? ''
  const ctlSm = drive ? 84 : 56, ctlLg = drive ? 124 : 86
  return (
    <>
      <div className="np-scrim" onClick={() => setOpen(false)} />
      <div className="np-sheet" ref={sheet} role="dialog" aria-modal="true" aria-label="Now playing" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="np-grab" aria-hidden="true" />
        <div className="np-top">
          <button className="np-round" onClick={() => setOpen(false)} aria-label="Minimise player">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <span className="np-label">Now playing</span>
          <button className="np-round plain" onClick={stop} aria-label="Stop and close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="np-progress">
          <span className="np-progress-fill" style={{ width: pct }} />
          <span style={{ position: 'relative', color: frac > 0.12 ? 'var(--color-bg)' : 'var(--color-text)' }}>{fmt(sec(done))}</span>
          <span className="np-progress-ref">{it.kicker}</span>
          <span style={{ position: 'relative' }}>-{fmt(sec(words - done))}</span>
        </div>
        <div className="np-head">
          <span className="np-cover" style={{ background: coverBg, color: ink }}>
            <span className="np-cover-title">{bookTitle}</span>
          </span>
          <span className="np-meta">
            <span className="np-title">{q.title}</span>
            <span className="muted">{bookTitle}</span>
            <span className="np-voice">{voice}</span>
          </span>
        </div>
        <p className="np-text" style={{ fontSize: drive ? 26 : 19 }}>
          {it.text}
        </p>
        <div className="np-controls">
          <button className="np-ctl" style={{ width: ctlSm, height: ctlSm }} onClick={() => listener.step(-1)} aria-label="Previous prayer">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M11 6v12l-8.5-6zM21 6v12l-8.5-6z" /></svg>
          </button>
          <button className="np-ctl np-main" style={{ width: ctlLg, height: ctlLg }} onClick={() => listener.toggle()} aria-label={playLabel}>
            <svg viewBox="0 0 100 100" className="np-ring">
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-divider)" strokeWidth="4" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={String(Math.round(289 * (1 - frac)))} />
            </svg>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ position: 'relative' }}><path d={icon} /></svg>
          </button>
          <button className="np-ctl" style={{ width: ctlSm, height: ctlSm }} onClick={() => listener.step(1)} aria-label="Next prayer">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M13 6v12l8.5-6zM3 6v12l8.5-6z" /></svg>
          </button>
        </div>
        <div className="np-bar">
          <BarBtn label={`${st.rate || 1}× Speed`} icon={IC.speed} onClick={rateNext} />
          <BarBtn label={sleepLabel || 'Sleep'} icon={IC.sleep} on={!!sleepLabel} onClick={() => listener.cycleSleep()} />
          <BarBtn label="Driving" icon={IC.car} on={drive} onClick={() => setDrive(!drive)} />
          <BarBtn label="Connect" icon={IC.cast} onClick={() => toast('Choose AirPlay or Bluetooth from your phone’s Control Centre')} />
        </div>
      </div>
    </>
  )
}

function BarBtn({ label, icon, on = false, onClick }: { label: string; icon: string; on?: boolean; onClick: () => void }) {
  return (
    <button className={on ? 'np-bar-btn on' : 'np-bar-btn'} onClick={onClick} aria-pressed={on}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
      <span>{label}</span>
    </button>
  )
}
