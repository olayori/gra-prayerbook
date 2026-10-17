import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase.ts'
import type { Part } from '../../book/types.ts'
import { useAdmin } from '../context.ts'
import { ensureU, partLabel, type Draft } from '../editor/engine.ts'
import { dayKey, filterUsers, posMap, toCsv, userRow, type ApiUser, type Filter, type SortKey, type UserRow } from './userStats.ts'

// Users tab (admins only): every signed-in account, its progress and its access
// (design/src/admin: loadUsers, userAct, exportCsv, usersVals). Progress is counted
// against the Book of Covenant Prayers, as in the old console.
const BOOK = 'covenant'
const fmt = (k: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, o)
}
const when = (ts: string | null) => {
  if (!ts) return '—'
  const d = new Date(ts), days = Math.floor((Date.now() - d.getTime()) / 864e5)
  return days < 1 ? 'Today' : days < 2 ? 'Yesterday' : days < 30 ? `${days} days ago` : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
const roleName = (r: UserRow['role']) => (r === 'admin' ? 'Admin' : r === 'editor' ? 'Editor' : null)
const COLS: [SortKey, string, 'left' | 'right'][] = [['name', 'Name', 'left'], ['role', 'Role', 'left'], ['created', 'Joined', 'left'], ['active', 'Last active', 'left'], ['prayed', 'Prayers', 'right'], ['days', 'Days', 'right'], ['streak', 'Streak', 'right']]
const FILTERS: [Filter, string][] = [['all', 'All'], ['members', 'Activated'], ['pending', 'Not activated'], ['staff', 'Staff']]
const HEAT = ['transparent', 'var(--color-accent-200)', 'var(--color-accent-400)', 'var(--color-accent-600)']

export default function UsersTab() {
  const { userId, toast } = useAdmin()
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [pub, setPub] = useState<Draft>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [f, setF] = useState<Filter>('all')
  const [sort, setSort] = useState<[SortKey, number]>(['active', -1])
  const [selId, setSelId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Sets state only after the first await, so it can run from the mount effect.
  const load = useCallback(async () => {
    const [r, l, ed] = await Promise.all([
      supabase.rpc('admin_users'),
      supabase.from('book_editions').select('version, layout').eq('book_slug', BOOK),
      supabase.rpc('get_edition', { p_slug: BOOK }),
    ])
    setLoading(false)
    if (r.error) {
      setErr('Couldn’t load users. ' + (r.error.message || ''))
      return
    }
    const lays: Record<number, Record<string, string>> = {}
    ;(l.data ?? []).forEach((x: { version: number; layout: { s: { p: string[] }[] }[] }) => (lays[x.version] = posMap(x.layout)))
    setPub(ensureU((ed.data?.data ?? []) as Part[]))
    setUsers(((r.data ?? []) as ApiUser[]).map((u) => userRow(u, lays)))
    setNow(new Date())
    setErr('')
  }, [])
  useEffect(() => {
    // load() sets state only after its await, so this doesn't render twice.
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
  }, [load])

  const all = users ?? []
  const rows = filterUsers(all, q, f, sort)

  const act = async (kind: 'reset' | 'del' | { role: UserRow['role'] }, u: UserRow) => {
    const nm = u.name || u.email
    if (kind === 'reset' && !window.confirm(`Reset all progress for ${nm}? Their check marks, favorites, bookmarks, history, plan and pen notes will be cleared on every device. This can’t be undone.`)) return
    if (kind === 'del' && window.prompt(`This permanently deletes ${nm}’s account and progress. Type DELETE to confirm.`) !== 'DELETE') return
    setBusy(true)
    const r =
      kind === 'reset'
        ? await supabase.rpc('admin_reset_user', { p_user: u.id })
        : kind === 'del'
          ? await supabase.rpc('admin_delete_user', { p_user: u.id })
          : await supabase.rpc('admin_set_role', { p_user: u.id, p_role: kind.role })
    setBusy(false)
    if (r.error) return toast(r.error.message)
    toast(kind === 'reset' ? 'Progress reset' : kind === 'del' ? 'Account deleted' : 'Access updated')
    if (kind === 'del') setSelId(null)
    await load()
  }

  const exportCsv = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }))
    a.download = `prayer-book-users-${dayKey(new Date())}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const close = useCallback(() => setSelId(null), [])
  const sel = selId ? all.find((x) => x.id === selId) : undefined
  const [sk, sd] = sort
  const activeWeek = all.filter((u) => u.active && now.getTime() - new Date(u.active).getTime() < 7 * 864e5).length

  return (
    <div className="adm-users">
      <div className="adm-users-head">
        <div className="adm-col" style={{ gap: 2, flex: 1, minWidth: 200 }}>
          <h1 className="adm-h1 small">Users</h1>
          <span className="adm-small tnum">{users ? `${all.length} accounts · ${all.filter((u) => u.member).length} activated · ${activeWeek} active this week` : ''}</span>
        </div>
        <input className="input adm-users-q" type="search" placeholder="Search name or email" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg-grid adm-modes" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
          {FILTERS.map(([v, label]) => (
            <button key={v} className={f === v ? 'seg-opt-btn on' : 'seg-opt-btn'} aria-pressed={f === v} onClick={() => setF(v)}>
              {label}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary adm-users-btn" onClick={exportCsv}>
          Export CSV
        </button>
        <button className="btn btn-ghost adm-users-btn" onClick={() => (setLoading(true), void load())}>
          Refresh
        </button>
      </div>
      {loading && !users && <p className="adm-p">Loading users…</p>}
      {err && (
        <p role="alert" className="adm-p" style={{ color: 'var(--color-accent-700)' }}>
          {err}
        </p>
      )}
      {users && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  {COLS.map(([k, label, align]) => (
                    <th key={k} style={{ textAlign: align }}>
                      <button onClick={() => setSort([k, sk === k ? -sd : k === 'name' || k === 'role' ? 1 : -1])}>
                        {label}
                        {sk === k ? (sd > 0 ? ' ↑' : ' ↓') : ''}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} onClick={() => setSelId(u.id)} className={selId === u.id ? 'on' : undefined}>
                    <td>
                      <div className="adm-col" style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 15 }}>{u.name || u.email.split('@')[0]}</span>
                        <span className="adm-small">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={u.role ? 'tag tag-accent' : u.member ? 'tag tag-outline' : 'tag tag-neutral'}>{roleName(u.role) || (u.member ? 'Reader' : 'Not activated')}</span>
                    </td>
                    <td className="tnum nowrap">{u.created ? new Date(u.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="tnum nowrap">{when(u.active)}</td>
                    <td className="tnum num">{u.prayed}</td>
                    <td className="tnum num">{u.days}</td>
                    <td className="tnum num">{u.streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p className="adm-p" style={{ textAlign: 'center' }}>No users match.</p>}
          <p className="adm-small">Only people who sign in with an account appear here. Readers who use the access code alone keep their progress on their device.</p>
        </>
      )}
      {sel && <UserPanel u={sel} pub={pub} now={now} self={sel.id === userId} busy={busy} onClose={close} onAct={(k) => void act(k, sel)} toast={toast} />}
    </div>
  )
}

function UserPanel({ u, pub, now, self, busy, onClose, onAct, toast }: { u: UserRow; pub: Draft; now: Date; self: boolean; busy: boolean; onClose: () => void; onAct: (k: 'reset' | 'del' | { role: UserRow['role'] }) => void; toast: (m: string) => void }) {
  const pos: Record<string, { num: string; pn: number }> = {}, partTot: Record<number, number> = {}
  pub.forEach((p, pi) => p.sections.forEach((s, si) => s.prayers.forEach((pr, i) => {
    pos[pr.u] = { num: `${pi + 1}.${si + 1}.${i + 1}`, pn: pi }
    partTot[pi] = (partTot[pi] || 0) + 1
  })))
  const partN: Record<number, number> = {}
  u.prayedU.forEach((x) => {
    if (pos[x]) partN[pos[x].pn] = (partN[pos[x].pn] || 0) + 1
  })
  const total = Object.values(partTot).reduce((a, b) => a + b, 0), done = u.prayedU.filter((x) => pos[x]).length
  const heat: { k: string; label: string; l: number }[] = []
  const end = new Date(now), start = new Date(now)
  start.setDate(end.getDate() - end.getDay() - 25 * 7)
  for (const x = new Date(start); x <= end; x.setDate(x.getDate() + 1)) {
    const k = dayKey(x), c = (u.hist[k] || []).length
    heat.push({ k, label: `${fmt(k)}: ${c}`, l: !c ? 0 : c < 5 ? 1 : c < 15 ? 2 : 3 })
  }
  const days = Object.keys(u.hist).filter((k) => u.hist[k].length).sort().reverse()
  const name = u.name || u.email.split('@')[0]
  const stats: [number | string, string][] = [[done, `Prayers checked · ${total ? Math.round((done / total) * 100) : 0}%`], [u.streak, 'Current streak'], [u.best, 'Longest streak'], [u.days, 'Days prayed'], [u.fav, 'Favorites'], [u.bm, 'Bookmarks']]
  const roles: [UserRow['role'], string][] = [[null, 'Reader'], ['editor', 'Editor'], ['admin', 'Admin']]
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  const pick = (r: UserRow['role']) => {
    if (self && r !== 'admin') toast('You can’t remove your own admin access')
    else if (u.role !== r) onAct({ role: r })
  }

  return (
    <>
      <div className="adm-scrim" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={name} className="adm-user">
        <div className="adm-user-head">
          <div className="adm-col" style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <h2 className="adm-user-name">{name}</h2>
            <span className="adm-p" style={{ fontSize: 14, wordBreak: 'break-all' }}>{u.email}</span>
            <span className="adm-small">
              {`Joined ${u.created ? new Date(u.created).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} · last active ${when(u.active).toLowerCase()}${u.member ? '' : ' · has not entered the access code'}`}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="adm-user-body">
          <div className="adm-user-stats">
            {stats.map(([v, label]) => (
              <div key={label}>
                <span className="adm-user-stat tnum">{v}</span>
                <span className="adm-eyebrow">{label}</span>
              </div>
            ))}
          </div>
          <div className="adm-col" style={{ gap: 8 }}>
            <span className="adm-eyebrow">Last 26 weeks</span>
            <div className="adm-heat">
              {heat.map((h) => (
                <span key={h.k} title={h.label} style={{ background: HEAT[h.l], borderColor: h.l ? 'transparent' : 'var(--color-divider)' }} />
              ))}
            </div>
          </div>
          <div className="adm-col" style={{ gap: 8 }}>
            <span className="adm-eyebrow">Progress by part</span>
            {pub.map((p, pi) => (
              <div key={p.u} className="adm-part-bar tnum">
                <span>{partLabel(pi)}</span>
                <span className="adm-bar-track"><span style={{ width: `${partTot[pi] ? ((partN[pi] || 0) / partTot[pi]) * 100 : 0}%` }} /></span>
                <span className="adm-small" style={{ textAlign: 'right' }}>{`${partN[pi] || 0} / ${partTot[pi] || 0}`}</span>
              </div>
            ))}
          </div>
          <div className="adm-col">
            <span className="adm-eyebrow adm-sub-head">Prayers checked by day</span>
            {!days.length && <p className="adm-p" style={{ margin: '12px 0 0', fontSize: 14 }}>No prayer history yet.</p>}
            {days.slice(0, 60).map((k) => (
              <div key={k} className="adm-log">
                <div className="adm-sub-head tnum" style={{ border: 0, padding: 0 }}>
                  <span className="adm-ver-title" style={{ fontSize: 16 }}>{fmt(k, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="adm-small">{`${u.hist[k].length} prayed`}</span>
                </div>
                <span className="adm-small tnum">{u.hist[k].map((x) => pos[x]?.num).filter(Boolean).join(', ') || 'Prayers since removed'}</span>
              </div>
            ))}
          </div>
          <div className="adm-col" style={{ gap: 12, paddingTop: 6 }}>
            <span className="adm-eyebrow">Access</span>
            <div className="seg-grid adm-modes" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {roles.map(([r, label]) => (
                <button key={label} className={u.role === r ? 'seg-opt-btn on' : 'seg-opt-btn'} aria-pressed={u.role === r} disabled={busy} onClick={() => pick(r)}>
                  {label}
                </button>
              ))}
            </div>
            <span className="adm-small">Editors can change and publish the book. Admins can also see users.</span>
            <div className="adm-row" style={{ flexWrap: 'wrap', paddingTop: 6 }}>
              <button className="btn btn-secondary adm-users-btn" onClick={() => onAct('reset')} disabled={busy}>
                Reset progress
              </button>
              <button className="btn btn-ghost adm-users-btn" onClick={() => onAct('del')} disabled={busy || self} style={{ color: 'var(--color-accent-800)' }}>
                Delete account
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
