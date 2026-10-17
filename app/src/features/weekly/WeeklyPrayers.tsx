import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchWeeks } from './api.ts'
import { customTitle, pickWeek, weekLabel, type Week } from './week.ts'

// Port of the Weekly Kingdom Prayers card from the book design
// (design/src/book: weeklyVals() in app.js, <article id="weekly"> in template.html).
// Not yet ported: listen, favorites, bookmarks, share, verse pop-ups, "prayed today".
export default function WeeklyPrayers() {
  const { weekOf } = useParams()
  const [weeks, setWeeks] = useState<Week[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetchWeeks().then(setWeeks, () => setFailed(true))
  }, [])

  if (failed) return <Status text="Couldn’t load the weekly prayers. Check your connection and try again." />
  if (!weeks) return <Status text="Loading…" />
  const week = pickWeek(weeks, weekOf)
  if (!week) return <Status text="No weekly prayers have been published yet." />

  // Keyed by week so switching weeks starts with a fresh card; a past week opens expanded.
  return <WeekCard key={week.week_of} week={week} weeks={weeks} startOpen={!!weekOf} />
}

function WeekCard({ week, weeks, startOpen }: { week: Week; weeks: Week[]; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const [showPast, setShowPast] = useState(false)
  const isCurrent = week === weeks[0]
  const title = customTitle(week.title)
  const shown = open ? week.prayers : week.prayers.slice(0, 2)
  const collapsed = !open && week.prayers.length > 2

  return (
    <main className="weekly">
      <article className="weekly-card">
        <div className="weekly-kicker">
          <span>GRA Weekly Kingdom Prayers</span>
          <span className="tag tag-outline">{isCurrent ? 'This week' : 'Past week'}</span>
        </div>
        <h1 className="weekly-date">Week of {weekLabel(week.week_of)}</h1>
        {title && <div className="weekly-title">{title}</div>}
        {week.intro && <p className="weekly-intro">{week.intro}</p>}

        <div className="weekly-actions">
          <button className="btn btn-ghost" onClick={() => setShowPast(!showPast)} aria-expanded={showPast}>
            Past weeks
          </button>
          {!isCurrent && (
            <Link className="btn btn-ghost" to="/weekly">
              Back to this week
            </Link>
          )}
        </div>

        {showPast && (
          <ul className="weekly-past">
            {weeks.map((w, i) => (
              <li key={w.week_of}>
                <Link to={i === 0 ? '/weekly' : `/weekly/${w.week_of}`} aria-current={w === week ? 'page' : undefined}>
                  <span>{weekLabel(w.week_of)}</span>
                  <span className="text-muted">
                    {w.prayers.length} {w.prayers.length === 1 ? 'prayer' : 'prayers'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <ol className="weekly-prayers">
          {shown.map((p, i) => (
            <li key={i}>
              <span className="weekly-n">{i + 1}</span>
              <div>
                <p>{p.text}</p>
                {p.ref && <span className="weekly-ref">{p.ref}</span>}
              </div>
            </li>
          ))}
        </ol>

        {open && week.closing && <p className="weekly-closing">{week.closing}</p>}
        <div className="weekly-more">
          {collapsed && (
            <button className="btn btn-secondary" onClick={() => setOpen(true)}>
              Show all {week.prayers.length} prayers
            </button>
          )}
          {open && week.prayers.length > 2 && (
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Show less
            </button>
          )}
        </div>
      </article>
    </main>
  )
}

function Status({ text }: { text: string }) {
  return (
    <main className="weekly">
      <p className="weekly-status">{text}</p>
    </main>
  )
}
