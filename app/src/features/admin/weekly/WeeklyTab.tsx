import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase.ts'
import { useAdmin } from '../context.ts'
import { parseWeekly } from './parse.ts'

// Weekly Kingdom Prayers editor (design/src/admin: loadWeeks, wkOpen, wkSplit, wkSave,
// wkDelete, weeklyVals). Weeks live in weekly_prayers; publish_at controls when readers see them.

type Row = { id: string; week_of: string; title: string; intro: string; closing: string; prayers: { text: string; ref?: string }[]; publish_at: string | null }
type Mode = 'sched' | 'now' | 'draft' | 'live'
type Week = { id: string | null; week_of: string; title: string; intro: string; closing: string; prayers: { text: string; ref: string }[]; mode: Mode; sd: string; st: string; was?: string | null }

const dk = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const nextMonday = () => {
  const d = new Date()
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7))
  return dk(d)
}
const wkFmt = (k: string) => {
  if (!k) return ''
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}
function statusOf(publishAt: string | null | undefined): [string, string] {
  if (!publishAt) return ['Draft', 'var(--color-neutral-700)']
  const t = new Date(publishAt)
  if (t > new Date())
    return [`Scheduled · ${t.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`, 'var(--color-accent-700)']
  return ['Live', 'var(--color-accent-800)']
}

export default function WeeklyTab() {
  const { me, toast, holdLeave } = useAdmin()
  const [list, setList] = useState<Row[] | null>(null)
  const [wk, setWk] = useState<Week | null>(null)
  const [paste, setPaste] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('weekly_prayers').select('*').order('week_of', { ascending: false })
    if (error) {
      setList([])
      toast('Couldn’t load weeks.')
      return []
    }
    setList(data as Row[])
    return data as Row[]
  }, [toast])
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    holdLeave(dirty ? 'Discard unsaved changes to this week?' : null)
    return () => holdLeave(null)
  }, [dirty, holdLeave])

  // force: re-opening the week just saved, so there is nothing to discard.
  const open = (row: Row | null, force = false) => {
    if (!force && dirty && !window.confirm('Discard unsaved changes to this week?')) return
    setPaste('')
    setNote('')
    setErr('')
    setDirty(false)
    if (!row) {
      const m = nextMonday()
      return setWk({ id: null, week_of: m, title: 'Weekly Kingdom Prayers', intro: '', closing: 'In Jesus Christ name we pray, AMEN!', prayers: [], mode: 'sched', sd: m, st: '06:00' })
    }
    const t = row.publish_at ? new Date(row.publish_at) : null, future = !!t && t > new Date()
    setWk({
      id: row.id, week_of: row.week_of, title: row.title, intro: row.intro || '', closing: row.closing || '',
      prayers: (row.prayers || []).map((p) => ({ text: p.text || '', ref: p.ref || '' })),
      mode: !t ? 'draft' : future ? 'sched' : 'live',
      sd: t ? dk(t) : row.week_of,
      st: t ? String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') : '06:00',
      was: row.publish_at,
    })
  }

  const patch = (p: Partial<Week>) => {
    setWk((w) => (w ? { ...w, ...p } : w))
    setDirty(true)
    setErr('')
  }
  const editPrayers = (fn: (a: Week['prayers']) => void) => {
    setWk((w) => {
      if (!w) return w
      const a = w.prayers.map((x) => ({ ...x }))
      fn(a)
      return { ...w, prayers: a }
    })
    setDirty(true)
  }

  const split = () => {
    if (!wk) return
    const r = parseWeekly(paste)
    if (!r.prayers.length) return setNote('No numbered prayers found. Each prayer should start with 1. 2. 3. …')
    const p: Partial<Week> = { prayers: r.prayers }
    if (r.week_of) {
      p.week_of = r.week_of
      if (wk.mode === 'sched' && !wk.id) p.sd = r.week_of
    }
    if (r.title) p.title = r.title
    if (r.intro) p.intro = r.intro
    if (r.closing) p.closing = r.closing
    patch(p)
    setNote(`${r.prayers.length} prayers found${r.week_of ? ' · week of ' + wkFmt(r.week_of) : ''}. Check them below.`)
  }

  const save = async () => {
    if (!wk) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(wk.week_of || '')) return setErr('Choose the week date.')
    const prayers = wk.prayers.map((p) => ({ text: p.text.trim(), ref: p.ref.trim() })).filter((p) => p.text)
    if (!prayers.length) return setErr('Add at least one prayer.')
    let publish_at: string | null = null
    if (wk.mode === 'now') publish_at = new Date().toISOString()
    else if (wk.mode === 'live') publish_at = wk.was || new Date().toISOString()
    else if (wk.mode === 'sched') {
      const d = new Date(wk.sd + 'T' + (wk.st || '06:00'))
      if (isNaN(d.getTime())) return setErr('Choose a valid date and time.')
      publish_at = d.toISOString()
    }
    const row = { week_of: wk.week_of, title: (wk.title || '').trim() || 'Weekly Kingdom Prayers', intro: (wk.intro || '').trim(), closing: (wk.closing || '').trim(), prayers, publish_at, updated_by_email: me || null }
    setBusy(true)
    setErr('')
    const q = wk.id ? supabase.from('weekly_prayers').update(row).eq('id', wk.id).select().single() : supabase.from('weekly_prayers').insert(row).select().single()
    const { data, error } = await q
    setBusy(false)
    if (error) {
      const m = error.message || ''
      return setErr(/duplicate|unique/i.test(m) ? 'There is already a week with that date. Open it from the list instead.' : 'Couldn’t save. ' + m)
    }
    await load()
    const mode = wk.mode
    open(data as Row, true)
    toast(mode === 'now' ? 'Live for all readers' : mode === 'sched' ? 'Scheduled' : mode === 'live' ? 'Saved. Readers see the change next time they open the book.' : 'Saved as draft')
  }

  const remove = async () => {
    if (!wk?.id) return
    if (!window.confirm('Delete the week of ' + wkFmt(wk.week_of) + '? Readers will no longer see it.')) return
    const { error } = await supabase.from('weekly_prayers').delete().eq('id', wk.id)
    if (error) return toast('Couldn’t delete. ' + error.message)
    setWk(null)
    setDirty(false)
    await load()
    toast('Week deleted')
  }

  const live = !!wk && (wk.mode === 'live' || (!!wk.was && new Date(wk.was) <= new Date()))
  const modes: [Mode, string][] = live ? [['live', 'Live'], ['draft', 'Unpublish']] : [['sched', 'Schedule'], ['now', 'Publish now'], ['draft', 'Keep as draft']]
  const [status, stColor] = wk?.id ? statusOf(wk.was) : ['New week', 'var(--color-neutral-700)']
  const sd = wk?.sd ? new Date(wk.sd + 'T' + (wk.st || '06:00')) : null
  const modeNote = !wk
    ? ''
    : wk.mode === 'sched'
      ? sd && !isNaN(sd.getTime())
        ? `Goes live for readers on ${sd.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} at ${sd.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} (your time).`
        : ''
      : wk.mode === 'now'
        ? 'Readers see it the next time they open the book.'
        : wk.mode === 'live'
          ? 'Readers can see this week. Changes show the next time they open the book.'
          : 'Only editors can see it.'
  const n = wk?.prayers.length ?? 0

  return (
    <div className="adm-split">
      <aside aria-label="Weeks" className="adm-outline">
        <div className="adm-outline-search">
          <button className="btn btn-primary btn-block" onClick={() => open(null)}>
            New week
          </button>
        </div>
        <div className="adm-outline-list adm-weeks">
          {!list && <p className="adm-small">Loading…</p>}
          {list && !list.length && <p className="adm-small">No weeks yet. Press New week and paste the prayers.</p>}
          {list?.map((r) => {
            const [st, c] = statusOf(r.publish_at)
            return (
              <button key={r.id} className="adm-week" onClick={() => open(r)} style={{ background: wk?.id === r.id ? 'var(--color-accent-100)' : undefined }}>
                <span className="adm-week-title">{wkFmt(r.week_of)}</span>
                <span className="adm-week-meta">
                  <span style={{ color: c }}>{st}</span>
                  <span>{(r.prayers || []).length} prayers</span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>
      <section className="adm-editor">
        {!wk ? (
          <div className="adm-wk-empty">
            <h2>GRA Weekly Kingdom Prayers</h2>
            <p>Choose a week on the left, or press New week. Paste the whole text and the console splits it into prayers.</p>
          </div>
        ) : (
          <div className="adm-wk">
            <div className="adm-row wrap" style={{ alignItems: 'flex-end', gap: 12 }}>
              <div className="adm-col" style={{ flex: 1, minWidth: 220, gap: 2 }}>
                <span className="adm-eyebrow" style={{ color: stColor }}>
                  {status}
                </span>
                <h1 className="adm-wk-heading">Week of {wkFmt(wk.week_of)}</h1>
              </div>
              {wk.id && (
                <button className="btn btn-ghost" onClick={() => void remove()}>
                  Delete week
                </button>
              )}
            </div>

            <section className="adm-wk-paste">
              <label className="adm-eyebrow" htmlFor="wk-paste">
                Paste the whole week
              </label>
              <textarea
                id="wk-paste"
                className="input"
                rows={6}
                value={paste}
                onChange={(e) => (setPaste(e.target.value), setNote(''))}
                placeholder="Paste from the PDF or WhatsApp: the date line, the numbered prayers, and the closing line."
              />
              <div className="adm-row wrap" style={{ gap: 12 }}>
                <button className="btn btn-secondary" onClick={split} disabled={!paste.trim()}>
                  Split into prayers
                </button>
                <span className="adm-small">{note || (n ? 'Splitting replaces the prayers below.' : 'Numbered prayers, scripture references and the closing line are picked up automatically.')}</span>
              </div>
            </section>

            <div className="adm-wk-grid">
              <label className="field">
                <span>Week of (Monday)</span>
                <input className="input" type="date" value={wk.week_of} onChange={(e) => patch({ week_of: e.target.value })} />
              </label>
              <label className="field">
                <span>Title</span>
                <input className="input" value={wk.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Weekly Kingdom Prayers" />
              </label>
            </div>
            <label className="field">
              <span>Introduction (optional)</span>
              <textarea className="input" rows={2} value={wk.intro} onChange={(e) => patch({ intro: e.target.value })} />
            </label>

            <section className="adm-col">
              <div className="adm-sub-head">
                <span className="adm-eyebrow">{n + (n === 1 ? ' prayer' : ' prayers')}</span>
              </div>
              {wk.prayers.map((p, i) => (
                <div key={i} className="adm-wk-prayer">
                  <span className="accent adm-wk-n">{i + 1}</span>
                  <div className="adm-col" style={{ gap: 8, minWidth: 0 }}>
                    <textarea
                      className="input"
                      rows={Math.max(3, Math.ceil(p.text.length / 90))}
                      value={p.text}
                      aria-label={`Prayer ${i + 1}`}
                      onChange={(e) => editPrayers((a) => void (a[i].text = e.target.value))}
                    />
                    <input
                      className="input adm-wk-ref"
                      value={p.ref}
                      aria-label={`Scripture for prayer ${i + 1}`}
                      placeholder="Scripture reference, e.g. Psalm 91:11"
                      onChange={(e) => editPrayers((a) => void (a[i].ref = e.target.value))}
                    />
                  </div>
                  <div className="adm-col" style={{ gap: 2 }}>
                    <button className="adm-icon" aria-label="Move up" title="Move up" disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1 }} onClick={() => editPrayers((a) => void (i > 0 && ([a[i - 1], a[i]] = [a[i], a[i - 1]])))}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                    </button>
                    <button className="adm-icon" aria-label="Move down" title="Move down" disabled={i === n - 1} style={{ opacity: i === n - 1 ? 0.3 : 1 }} onClick={() => editPrayers((a) => void (i < a.length - 1 && ([a[i + 1], a[i]] = [a[i], a[i + 1]])))}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    <button className="adm-icon" aria-label={`Remove prayer ${i + 1}`} title="Remove" onClick={() => editPrayers((a) => void a.splice(i, 1))}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={() => editPrayers((a) => void a.push({ text: '', ref: '' }))}>
                + Add prayer
              </button>
            </section>

            <label className="field">
              <span>Closing line</span>
              <input className="input" value={wk.closing} onChange={(e) => patch({ closing: e.target.value })} placeholder="In Jesus Christ name we pray, AMEN!" />
            </label>

            <section className="adm-wk-live">
              <span className="adm-eyebrow">Going live</span>
              <div className="seg-grid adm-modes" style={{ gridTemplateColumns: `repeat(${modes.length}, auto)` }}>
                {modes.map(([k, label]) => (
                  <button key={k} className={wk.mode === k ? 'seg-opt-btn on' : 'seg-opt-btn'} aria-pressed={wk.mode === k} onClick={() => patch({ mode: k })}>
                    {label}
                  </button>
                ))}
              </div>
              {wk.mode === 'sched' && (
                <div className="adm-row wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
                  <label className="field">
                    <span>Date</span>
                    <input className="input" type="date" value={wk.sd} onChange={(e) => patch({ sd: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Time</span>
                    <input className="input" type="time" value={wk.st} onChange={(e) => patch({ st: e.target.value })} />
                  </label>
                </div>
              )}
              <span className="adm-small">{modeNote}</span>
              {err && (
                <div role="alert" className="lock-error">
                  {err}
                </div>
              )}
              <div className="adm-row" style={{ gap: 10 }}>
                <button className="btn btn-primary adm-wk-save" onClick={() => void save()} disabled={busy}>
                  {busy ? 'Saving…' : wk.mode === 'now' ? 'Publish now' : wk.mode === 'sched' ? 'Schedule' : wk.mode === 'live' ? 'Save changes' : 'Save draft'}
                </button>
                {dirty && <span className="adm-small">Unsaved changes</span>}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}
