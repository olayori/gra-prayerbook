import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import Sheet from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { ArrowRight, ArrowUp, Bookmark, CheckAll, ChevronLeft, DoneCircle, Gear, Moon, Ring, Sun } from '../../components/icons.tsx'
import { FONTS, useSettings } from '../../lib/settings.ts'
import { fetchWeeks } from '../weekly/api.ts'
import { weekLabel, type Week } from '../weekly/week.ts'
import { BOOKS, isBookKey, loadBook, type BookConfig } from './books.ts'
import Logo from './Logo.tsx'
import { useMarks, type Marks } from './marks.ts'
import { buildBook, ringDash, type BookView, type PartView } from './model.ts'
import SectionBlock from './SectionBlock.tsx'
import SettingsSheet from './SettingsSheet.tsx'
import type { Part, Scripture } from './types.ts'

// Port of the book reader (design/src/book) for Covenant Prayers and JCFP.
// Not yet ported: Focused Mode, Listen, share, search, plans, saved/history sheets,
// pen, paged mode, sync and sign-in. See CLAUDE.md for the porting order.
export default function Reader() {
  const { book } = useParams()
  if (book === 'weekly') return <Navigate to="/weekly" replace />
  if (!isBookKey(book)) return <Navigate to="/" replace />
  return <BookReader key={book} book={BOOKS[book]} />
}

function BookReader({ book }: { book: BookConfig }) {
  const [data, setData] = useState<Part[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    document.title = `${book.title} · Overcomer’s Library`
    loadBook(book.key).then(setData, () => setFailed(true))
  }, [book])

  if (failed) return <p className="status">Couldn’t open this book. Please try again.</p>
  if (!data) return <p className="status">Opening…</p>
  return <BookPages book={book} data={data} />
}

function BookPages({ book, data }: { book: BookConfig; data: Part[] }) {
  const { settings, set, dark } = useSettings()
  const marks = useMarks(book.key)
  const [toast, showToast] = useToast()
  const [sheet, setSheet] = useState<'aa' | Scripture | null>(null)
  const { prayed, fav, bm } = marks
  const view = useMemo(() => buildBook(book, data, { prayed, fav, bm }, settings.verses), [book, data, prayed, fav, bm, settings.verses])

  const goto = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const h = document.querySelector<HTMLElement>('.reader-hdr')?.offsetHeight ?? 56
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - h - 8, behavior: smooth ? 'smooth' : 'auto' })
  }

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
          <PartIntro p={p} marks={marks} toast={showToast} />
          {p.sections.map((s) => (
            <SectionBlock key={s.id} s={s} marks={marks} toast={showToast} onVerse={setSheet} />
          ))}
          {p.weeklyAfter && <WeeklyInline />}
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

      {sheet === 'aa' && <SettingsSheet onClose={() => setSheet(null)} />}
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

function PartIntro({ p, marks, toast }: { p: PartView; marks: Marks; toast: (t: string) => void }) {
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
          <button className="btn btn-ghost" onClick={() => marks.setMany(p.ids, !all)}>
            <CheckAll />
            <span>{all ? 'Clear watch' : 'Mark all prayed'}</span>
          </button>
          <button className="btn btn-ghost" onClick={() => toast(marks.toggleBm(p.id) ? 'Bookmarked' : 'Bookmark removed')}>
            <Bookmark on={p.bookmarked} />
            <span>{p.bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
        </div>
      )}
      {p.done > 0 && (
        <div className="part-done">
          <span>
            {p.done} of {p.total} prayed
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => window.confirm(`Clear all checked prayers in ${p.label}?`) && marks.clearPrefix(`s-${p.n}-`)}
          >
            Reset part
          </button>
        </div>
      )}
    </section>
  )
}

// JCFP: this week's Kingdom Prayers, after the last prayer watch.
function WeeklyInline() {
  const [week, setWeek] = useState<Week | null | undefined>(undefined)
  useEffect(() => {
    fetchWeeks().then((w) => setWeek(w[0] ?? null), () => setWeek(null))
  }, [])
  return (
    <section id="weekly-kp" className="weekly-inline">
      <header className="section-hdr">
        <span className="eyebrow accent wide">GRA Weekly Kingdom Prayers</span>
        <h3 className="section-title">{week ? `Week of ${weekLabel(week.week_of)}` : 'This week'}</h3>
        <div className="actions">
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
            <div className="prayer-body">
              <p>{wp.text}</p>
              {wp.ref && <span className="weekly-ref">{wp.ref}</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
