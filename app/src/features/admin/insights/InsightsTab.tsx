import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../../lib/supabase.ts'
import { useAdmin } from '../context.ts'
import { useEditor } from '../editor/EditorContext.ts'
import { dayKey } from '../users/userStats.ts'
import { aggregate, type Ranked, type UsageRow } from './aggregate.ts'

// Insights tab: anonymous usage counts (design/src/admin: loadInsights, insightsVals).
// Only the Book of Covenant Prayers logs usage.
const RANGES: [number, string][] = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, 'Year']]
const fmt = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function InsightsTab() {
  const { book } = useAdmin()
  if (book.slug !== 'covenant')
    return (
      <div className="adm-ins">
        <Head />
        <p className="adm-p">Usage is only counted for the Book of Covenant Prayers.</p>
      </div>
    )
  return <Covenant />
}

function Head({ days, pick }: { days?: number; pick?: (d: number) => void }) {
  return (
    <div className="adm-users-head">
      <div className="adm-col" style={{ gap: 2, flex: 1, minWidth: 200 }}>
        <h1 className="adm-h1 small">Insights</h1>
        <span className="adm-small">Anonymous counts from readers who haven’t opted out</span>
      </div>
      {pick && (
        <div className="seg-grid adm-modes" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
          {RANGES.map(([v, label]) => (
            <button key={v} className={days === v ? 'seg-opt-btn on' : 'seg-opt-btn'} aria-pressed={days === v} onClick={() => pick(v)}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Covenant() {
  const { toast } = useAdmin()
  const { store, setSel, open, setOpen, focusPrayer } = useEditor()
  useSyncExternalStore(store.subscribe, () => store.version)
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<UsageRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [today, setToday] = useState(() => new Date())

  // Sets state only after its await, so it can run from the mount effect.
  const load = useCallback(async (n: number) => {
    const since = new Date()
    since.setDate(since.getDate() - n + 1)
    const { data, error } = await supabase.from('usage_daily').select('day, kind, ref, n').gte('day', dayKey(since)).limit(100000)
    setLoading(false)
    if (error) {
      setErr('Couldn’t load usage. ' + (error.message || ''))
      return
    }
    setErr('')
    setRows((data ?? []) as UsageRow[])
    setToday(new Date())
  }, [])
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void load(30)
  }, [load])
  const pick = (n: number) => {
    setDays(n)
    setLoading(true)
    void load(n)
  }

  const goSection = (u: string) => {
    const p = store.draft?.find((pp) => pp.sections.some((s) => s.u === u))
    if (!p) return toast('That section is no longer in the draft')
    setSel({ kind: 'section', u })
    setOpen({ ...open, [p.u]: true })
    navigate('/admin/content')
  }
  const goPrayer = (u: string) => {
    for (const p of store.draft ?? [])
      for (const s of p.sections)
        if (s.prayers.some((x) => x.u === u)) {
          focusPrayer(u)
          setSel({ kind: 'section', u: s.u })
          setOpen({ ...open, [p.u]: true })
          navigate('/admin/content')
          return
        }
    toast('That prayer is no longer in the draft')
  }

  const a = rows && !loading ? aggregate(rows, store.pub, days, today) : null
  const list = (items: Ranked[], go: (u: string) => void, clamp: boolean) =>
    !items.length ? (
      <p className="adm-p" style={{ margin: '12px 0 0', fontSize: 14 }}>No activity in this period yet.</p>
    ) : (
      items.map((r) => (
        <button key={r.u} className="adm-ins-row" onClick={() => go(r.u)}>
          <span className="adm-ref tnum" style={{ fontSize: 16 }}>{r.num}</span>
          <span className={clamp ? 'adm-ins-text clamp' : 'adm-ins-text'}>{r.text}</span>
          <span className="adm-small tnum">{r.n}</span>
        </button>
      ))
    )

  return (
    <div className="adm-ins">
      <Head days={days} pick={pick} />
      {loading && <p className="adm-p">Loading…</p>}
      {err && (
        <p role="alert" className="adm-p" style={{ color: 'var(--color-accent-700)' }}>
          {err}
        </p>
      )}
      {a && (
        <>
          <div className="adm-ins-stats">
            {a.stats.map((s) => (
              <div key={s.label}>
                <span className="adm-ins-stat tnum">{s.v}</span>
                <span className="adm-eyebrow">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="adm-col" style={{ gap: 8 }}>
            <span className="adm-eyebrow">Prayers checked each day</span>
            <div className="adm-ins-bars">
              {a.dayBars.map((d) => (
                <div key={d.k} title={`${fmt(d.k)}: ${d.n}`} style={{ height: d.h }} />
              ))}
            </div>
            <div className="adm-sub-head adm-small" style={{ border: 0, padding: 0 }}>
              <span>{fmt(a.first)}</span>
              <span>Today</span>
            </div>
          </div>
          <div className="adm-ins-grid">
            <div className="adm-col" style={{ gap: 9 }}>
              <span className="adm-eyebrow">By part</span>
              {a.parts.map((p) => (
                <div key={p.label} className="adm-part-bar tnum" style={{ gridTemplateColumns: '80px minmax(0,1fr) 56px' }}>
                  <span>{p.label}</span>
                  <span className="adm-bar-track"><span style={{ width: p.w }} /></span>
                  <span className="adm-small" style={{ textAlign: 'right' }}>{p.n}</span>
                </div>
              ))}
            </div>
            <div className="adm-col" style={{ gap: 10 }}>
              <span className="adm-eyebrow">Themes searched</span>
              {!a.themes.length && <p className="adm-p" style={{ fontSize: 14 }}>No theme searches yet.</p>}
              <div className="adm-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {a.themes.map((t) => (
                  <span key={t.label} className="tag tag-outline tnum">{`${t.label} · ${t.n}`}</span>
                ))}
              </div>
            </div>
            <div className="adm-col">
              <span className="adm-eyebrow adm-sub-head">Most prayed</span>
              {list(a.top, goPrayer, true)}
            </div>
            <div className="adm-col">
              <span className="adm-eyebrow adm-sub-head">Sections opened in Focused Mode or Listen</span>
              {list(a.secs, goSection, false)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
