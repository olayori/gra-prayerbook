import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import Sheet from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { ArrowRight, ArrowUp, Bookmark, CheckAll, ChevronLeft, DoneCircle, FocusIcon, Gear, Moon, Ring, Speaker, Sun } from '../../components/icons.tsx'
import { useAuth } from '../../lib/auth.ts'
import { FONTS, useSettings } from '../../lib/settings.ts'
import { ttsSupported } from '../../lib/speech.ts'
import { supabase } from '../../lib/supabase.ts'
import { fetchWeeks } from '../weekly/api.ts'
import { weekLabel, type Week } from '../weekly/week.ts'
import { BOOKS, isBookKey, loadBook, type BookConfig } from './books.ts'
import Focus, { type FocusStart } from './Focus.tsx'
import { Listener } from './listen.ts'
import LockScreen from './LockScreen.tsx'
import Logo from './Logo.tsx'
import { buildBook, ringDash, type BookView, type PartView } from './model.ts'
import SectionBlock from './SectionBlock.tsx'
import NowPlaying from './NowPlaying.tsx'
import SettingsSheet from './SettingsSheet.tsx'
import { BookStore } from './store.ts'
import type { Scripture } from './types.ts'

// Port of the book reader (design/src/book) for Covenant Prayers and JCFP.
// Not yet ported: share, search, plans, saved/history sheets, pen and paged mode. See CLAUDE.md for the porting order.
export default function Reader() {
  const { book } = useParams()
  if (book === 'weekly') return <Navigate to="/weekly" replace />
  if (!isBookKey(book)) return <Navigate to="/" replace />
  return <BookReader key={book} book={BOOKS[book]} />
}

function BookReader({ book }: { book: BookConfig }) {
  const { locked, user } = useAuth()
  const [store] = useState(() => new BookStore(book, supabase))
  const [failed, setFailed] = useState(false)
  useSyncExternalStore(store.subscribe, () => store.version)

  useEffect(() => {
    document.title = `${book.title} · Overcomer’s Library`
    loadBook(book.key).then((d) => store.init(d), () => setFailed(true))
  }, [book, store])

  // Account sync: pull on open, when the app returns to the foreground or comes back
  // online, and every 2 minutes (as the design does).
  const syncUser = locked ? null : user
  useEffect(() => {
    store.setUser(syncUser)
    if (!syncUser) return
    const onVis = () => !document.hidden && void store.pull()
    const poll = setInterval(() => !document.hidden && void store.pull(), 120_000)
    document.addEventListener('visibilitychange', onVis)
    addEventListener('online', onVis)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVis)
      removeEventListener('online', onVis)
    }
  }, [store, syncUser])

  // Usage counts go out after 8s, every 5 minutes, and when the app is hidden.
  useEffect(() => {
    const flush = () => void store.flushUse()
    const onHide = () => document.hidden && flush()
    const first = setTimeout(flush, 8000)
    const every = setInterval(flush, 300_000)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearTimeout(first)
      clearInterval(every)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [store])

  if (locked) return <LockScreen title={book.title} />
  if (failed) return <p className="status">Couldn’t open this book. Please try again.</p>
  if (!store.data.length) return <p className="status">Opening…</p>
  return <BookPages book={book} store={store} />
}

function BookPages({ book, store }: { book: BookConfig; store: BookStore }) {
  const { settings, set, dark } = useSettings()
  const [toast, showToast] = useToast()
  const [sheet, setSheet] = useState<'aa' | Scripture | null>(null)
  const [focus, setFocus] = useState<FocusStart | null>(null)
  const weeks = useWeeks(book.key === 'jcfp')
  useEffect(() => store.setToastHandler(showToast), [store, showToast])
  // Re-rendered by the store subscription in BookReader; building the view is cheap.
  const view = buildBook(book, store.data, { prayed: store.prayed, fav: store.fav, bm: store.bm }, settings.verses)

  const goto = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const h = document.querySelector<HTMLElement>('.reader-hdr')?.offsetHeight ?? 56
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - h - 12, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Read aloud.
  const [listener] = useState(
    () =>
      new Listener({
        key: book.key,
        title: book.title,
        data: () => store.data,
        isPrayed: (pid) => !!store.prayed[pid],
        markPrayed: (pid) => store.setMany([pid], true),
        logOpen: (sid) => store.logUse('open', [sid]),
        toast: showToast,
        scrollTo: (id) => goto(id),
      }, settings),
  )
  useEffect(() => listener.setSettings(settings), [listener, settings])
  useSyncExternalStore(listener.subscribe, () => listener.version)
  useEffect(() => () => listener.stop(), [listener])
  const listen = (sid: string, pid?: string) => listener.start(sid, pid)
  const openFocus = (sid: string, i?: number) => {
    listener.stop()
    setFocus({ sid, i })
  }
  const readingPid = listener.state?.pid ?? null
  const weekly = (weeks?.[0]?.prayers ?? []).map((p) => ({ text: p.text, scripture: p.ref ? [{ ref: p.ref, verses: [] }] : [] }))

  return (
    <div
      className="reader"
      style={{
        fontFamily: FONTS[settings.font],
        fontSize: settings.size,
        lineHeight: settings.lh,
        letterSpacing: settings.ls === 'wide' ? '.06em' : 'normal',
      }}
    >
      <header className="reader-hdr">
        <div className="reader-bar">
          <Link to="/" className="hdr-btn hdr-home" aria-label="Back to Library" title="Back to Library">
            <ChevronLeft />
            <Logo kind="mark" className="hdr-mark" />
            <span className="hdr-label">Library</span>
          </Link>
          <button className="hdr-btn" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" title="Back to top">
            <ArrowUp />
            <span className="hdr-label">Top</span>
          </button>
          <span className="spacer" />
          <span className="hdr-count" aria-label={`${view.done} of ${view.total} prayers checked`}>
            <span>
              <span className="accent">{view.done}</span> / {view.total}
            </span>
          </span>
          <button
            className="icon-btn"
            onClick={() => set(dark ? { theme: settings.lastLight } : { theme: 'dark' })}
            aria-label={dark ? 'Switch to light page' : 'Switch to dark page'}
            title={dark ? 'Switch to light page' : 'Switch to dark page'}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
          <button className="icon-btn" onClick={() => setSheet(sheet === 'aa' ? null : 'aa')} aria-label="Settings" title="Settings">
            <Gear />
          </button>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: view.total ? `${(view.done / view.total) * 100}%` : '0%' }} />
        </div>
      </header>

      <section className="title-page">
        <div className="title-logo">
          <Logo kind="full" alt="God’s Remnant Assembly — Citadel of Miracles" />
        </div>
        <div className="rule" />
        <h1>{book.title}</h1>
        <div className="rule" />
        <div className="title-stats">{view.stats}</div>
      </section>

      <Contents view={view} goto={goto} />

      {view.parts.map((p) => (
        <div key={p.id}>
          <PartIntro p={p} store={store} toast={showToast} onFocus={openFocus} onListen={listen} />
          {p.sections.map((s) => (
            <SectionBlock
              key={s.id}
              s={s}
              store={store}
              readingPid={readingPid}
              toast={showToast}
              onVerse={setSheet}
              onFocus={openFocus}
              onListen={listen}
            />
          ))}
          {p.weeklyAfter && <WeeklyInline weeks={weeks} onFocus={(i) => openFocus('wk', i)} />}
        </div>
      ))}

      <footer className="reader-end">
        <div className="end-logo">
          <Logo kind="mark" />
        </div>
        <div className="end-line">God’s Remnant Assembly · The Overcomers’ World</div>
        <button className="link-btn" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to the beginning
        </button>
      </footer>

      <NowPlaying listener={listener} bookKey={book.key} bookTitle={book.title} toast={showToast} />
      {focus && (
        <Focus
          bookKey={book.key}
          data={store.data}
          store={store}
          weekly={weekly}
          start={focus}
          toast={showToast}
          onClose={(pid) => {
            setFocus(null)
            if (pid && !pid.startsWith('wk')) requestAnimationFrame(() => goto(pid))
          }}
        />
      )}
      {sheet === 'aa' && <SettingsSheet store={store} onClose={() => setSheet(null)} />}
      {sheet && sheet !== 'aa' && (
        <Sheet title="Scripture" onClose={() => setSheet(null)}>
          <div className="verse-sheet">
            <div className="verse-ref">
              {sheet.ref} <span>KJV</span>
            </div>
            {sheet.verses.length ? (
              <p>
                {sheet.verses.map((v, k) => (
                  <span key={k}>
                    {v.n && <sup>{v.n}</sup>}
                    {v.text}{' '}
                  </span>
                ))}
              </p>
            ) : (
              // TODO(port): the design fetches missing passages from bible-api.com and caches them.
              <p className="muted">This passage isn’t included in the book.</p>
            )}
          </div>
        </Sheet>
      )}
      {toast}
    </div>
  )
}

function Contents({ view, goto }: { view: BookView; goto: (id: string) => void }) {
  return (
    <section id="contents" className="contents">
      <div className="contents-head">
        <div className="eyebrow accent">Table of Contents</div>
        <div className="rule short" />
      </div>
      <div className="contents-grid">
        {view.parts.map((p) => (
          <div key={p.id} className="contents-part">
            <button className="toc-part" onClick={() => goto(p.id)}>
              <span className="toc-num">{p.showNum ? p.n : ''}</span>
              <span className="toc-title">{p.title}</span>
              <Progress done={p.done} total={p.total} />
            </button>
            {p.sections.map((s) => (
              <button key={s.id} className="toc-sec" onClick={() => goto(s.id)}>
                <span className="toc-secnum">{s.tocNum}</span>
                <span className="toc-sectitle">{s.title}</span>
                <span className="toc-count">{s.tocCount}</span>
                <Progress done={s.done} total={s.total} />
              </button>
            ))}
            {p.weeklyAfter && (
              <button className="toc-sec" onClick={() => goto('weekly-kp')}>
                <span />
                <span className="toc-sectitle">GRA Weekly Kingdom Prayers</span>
                <span />
                <span />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <span className="toc-state">
      {total > 0 && done === total ? <DoneCircle /> : done > 0 ? <Ring dash={ringDash(done / total)} /> : null}
    </span>
  )
}

type PartProps = {
  p: PartView
  store: BookStore
  toast: (t: string) => void
  onFocus: (sid: string, i?: number) => void
  onListen: (sid: string) => void
}

function PartIntro({ p, store, toast, onFocus, onListen }: PartProps) {
  const first = p.sections.find((s) => !s.isList)
  const all = p.total > 0 && p.done === p.total
  return (
    <section id={p.id} className="part-intro">
      <div className="part-watermark" aria-hidden="true">
        <Logo kind="watermark" />
      </div>
      <Logo kind="mark" className="part-mark" />
      {p.showNum && <div className="part-num">{p.n}</div>}
      <div className="part-label">{p.label}</div>
      <h2>{p.titleCase}</h2>
      {p.subtitle && <p className="part-sub">{p.subtitle}</p>}
      <div className="part-count">{p.count}</div>
      {p.hasActions && (
        <div className="actions center">
          <button className="btn btn-ghost" onClick={() => store.setMany(p.ids, !all)}>
            <CheckAll />
            <span>{all ? 'Clear watch' : 'Mark all prayed'}</span>
          </button>
          <button className="btn btn-ghost" onClick={() => first && onFocus(first.id)}>
            <FocusIcon />
            <span>Focused Mode</span>
          </button>
          <button className="btn btn-ghost" onClick={() => toast(store.toggleBm(p.id) ? 'Bookmarked' : 'Bookmark removed')}>
            <Bookmark on={p.bookmarked} />
            <span>{p.bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
          {ttsSupported() && (
            <button className="btn btn-ghost" onClick={() => onListen(p.id)}>
              <Speaker />
              <span>Listen</span>
            </button>
          )}
        </div>
      )}
      {p.done > 0 && (
        <div className="part-done">
          <span>
            {p.done} of {p.total} prayed
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => window.confirm(`Clear all checked prayers in ${p.label}?`) && store.clearPrefix(`s-${p.n}-`)}
          >
            Reset part
          </button>
        </div>
      )}
    </section>
  )
}

// Published weekly prayers, newest first (undefined while loading, null if unavailable).
function useWeeks(enabled: boolean) {
  const [weeks, setWeeks] = useState<Week[] | null | undefined>(undefined)
  useEffect(() => {
    if (enabled) fetchWeeks().then(setWeeks, () => setWeeks(null))
  }, [enabled])
  return weeks
}

// JCFP: this week's Kingdom Prayers, after the last prayer watch.
function WeeklyInline({ weeks, onFocus }: { weeks: Week[] | null | undefined; onFocus: (i: number) => void }) {
  const week = weeks === undefined ? undefined : (weeks?.[0] ?? null)
  return (
    <section id="weekly-kp" className="weekly-inline">
      <header className="section-hdr">
        <span className="eyebrow accent wide">GRA Weekly Kingdom Prayers</span>
        <h3 className="section-title">{week ? `Week of ${weekLabel(week.week_of)}` : 'This week'}</h3>
        <div className="actions">
          {week && (
            <button className="btn btn-ghost" onClick={() => onFocus(0)}>
              <FocusIcon />
              <span>Focused Mode</span>
            </button>
          )}
          <Link to="/weekly" className="btn btn-ghost">
            <span>All weeks</span>
            <ArrowRight />
          </Link>
        </div>
      </header>
      {week === null && <p className="muted">This week’s prayers appear here once they are published on Monday.</p>}
      <ol className="prayers">
        {week?.prayers.map((wp, i) => (
          <li key={i} className="prayer plain">
            <span className="prayer-n">{i + 1}</span>
            <div className="prayer-body tappable" onClick={() => onFocus(i)} title="Open in Focused Mode">
              <p>{wp.text}</p>
              {wp.ref && <span className="weekly-ref">{wp.ref}</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
