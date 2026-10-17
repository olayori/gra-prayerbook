// The Users tab's numbers, ported from the old Admin Console (design/src/admin/app.js:
// histStats, posMap, userRow, filteredUsers, exportCsv).

export type ApiUser = {
  user_id: string; email: string | null; name: string | null; created_at: string | null; last_sign_in_at: string | null
  state_at: string | null; is_member: boolean; role: 'editor' | 'admin' | null; ink_pages: number | null
  data: { prayed?: Record<string, unknown>; hist?: Record<string, string[]>; fav?: Record<string, unknown>; bm?: Record<string, unknown>; plan?: unknown; bv?: number } | null
}
export type UserRow = {
  id: string; email: string; name: string; created: string | null; active: string | null; member: boolean; role: 'editor' | 'admin' | null
  prayedU: string[]; hist: Record<string, string[]>; prayed: number; days: number; streak: number; best: number; fav: number; bm: number; ink: number; plan: boolean
}
export type Filter = 'all' | 'members' | 'pending' | 'staff'
export type SortKey = 'name' | 'role' | 'created' | 'active' | 'prayed' | 'days' | 'streak'

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Current streak (today, or ending yesterday), best streak, and days prayed.
export function histStats(h: Record<string, string[]> | undefined, today = new Date()) {
  const days = Object.keys(h || {}).filter((k) => h![k]?.length).sort(), set = new Set(days)
  let cur = 0
  const d = new Date(today)
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1)
  while (set.has(dayKey(d))) {
    cur++
    d.setDate(d.getDate() - 1)
  }
  let best = 0, run = 0, prev: number | null = null
  days.forEach((k) => {
    const [y, m, dd] = k.split('-').map(Number), t = Math.round(Date.UTC(y, m - 1, dd) / 864e5)
    run = prev != null && t - prev === 1 ? run + 1 : 1
    prev = t
    if (run > best) best = run
  })
  return { cur, best, days: days.length }
}

// Position id (s-1-2-3) → stable prayer id, for one edition's layout.
export function posMap(layout: { s: { p: string[] }[] }[]): Record<string, string> {
  const pu: Record<string, string> = {}
  layout.forEach((p, pi) => p.s.forEach((s, si) => s.p.forEach((u, i) => (pu[`s-${pi + 1}-${si + 1}-${i + 1}`] = u))))
  return pu
}

// layouts: edition version → posMap. Progress is stored by position in the edition the user had.
export function userRow(u: ApiUser, layouts: Record<number, Record<string, string>>, today = new Date()): UserRow {
  const d = u.data || {}, h = d.hist || {}, st = histStats(h, today), m = layouts[d.bv || 0] || layouts[0] || {}
  const toU = (id: string) => m[id] || null
  return {
    id: u.user_id,
    email: u.email || '',
    name: u.name || '',
    created: u.created_at,
    active: [u.last_sign_in_at, u.state_at].filter(Boolean).sort().pop() || null,
    member: u.is_member,
    role: u.role || null,
    prayedU: Object.keys(d.prayed || {}).map(toU).filter(Boolean) as string[],
    hist: Object.fromEntries(Object.entries(h).map(([k, l]) => [k, (l || []).map(toU).filter(Boolean) as string[]])),
    prayed: Object.keys(d.prayed || {}).length,
    days: st.days,
    streak: st.cur,
    best: st.best,
    fav: Object.keys(d.fav || {}).length,
    bm: Object.keys(d.bm || {}).length,
    ink: u.ink_pages || 0,
    plan: !!d.plan,
  }
}

export function filterUsers(rows: UserRow[], q: string, f: Filter, [k, dir]: [SortKey, number]): UserRow[] {
  q = q.trim().toLowerCase()
  const list = rows.filter(
    (u) => (!q || (u.name + ' ' + u.email).toLowerCase().includes(q)) && (f === 'all' || (f === 'members' && u.member) || (f === 'staff' && !!u.role) || (f === 'pending' && !u.member)),
  )
  const val = (u: UserRow): string | number => (k === 'name' ? (u.name || u.email).toLowerCase() : k === 'role' ? u.role || '' : (u[k] ?? '') as string | number)
  return list.sort((a, b) => {
    const x = val(a), y = val(b)
    return (x > y ? 1 : x < y ? -1 : 0) * dir
  })
}

export function toCsv(rows: UserRow[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = ['Name', 'Email', 'Role', 'Activated', 'Joined', 'Last active', 'Prayers checked', 'Days prayed', 'Current streak', 'Longest streak', 'Favorites', 'Bookmarks', 'Pages with pen notes']
  const lines = [
    head,
    ...rows.map((u) => [u.name, u.email, u.role || 'reader', u.member ? 'yes' : 'no', u.created ? u.created.slice(0, 10) : '', u.active ? u.active.slice(0, 10) : '', u.prayed, u.days, u.streak, u.best, u.fav, u.bm, u.ink]),
  ].map((r) => r.map(esc).join(','))
  return '﻿' + lines.join('\n')
}
