import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { auth, useAuth } from '../../lib/auth.ts'
import { supabase } from '../../lib/supabase.ts'
import Logo from '../book/Logo.tsx'
import './admin.css'
import { AdminContext, type AdminBook, type Role } from './context.ts'

// The Admin Console (web only), rebuilt from design/src/admin. Sign-in uses the same
// account and session as the books.
type Phase = 'loading' | 'signin' | 'denied' | 'ready'

const TABS: { path: string; label: string; adminOnly?: boolean }[] = [
  { path: 'content', label: 'Content' },
  { path: 'weekly', label: 'Weekly' },
  { path: 'users', label: 'Users', adminOnly: true },
  { path: 'translations', label: 'Translations' },
  { path: 'insights', label: 'Insights' },
  { path: 'history', label: 'History' },
]

const BOOK_KEY = 'gra-admin-book'

export default function AdminApp() {
  if (Capacitor.isNativePlatform()) return <Navigate to="/" replace />
  return <Console />
}

function Console() {
  const { ready, user } = useAuth()
  const [role, setRole] = useState<Role | null | undefined>(undefined)
  const [books, setBooks] = useState<AdminBook[]>([])
  const [slug, setSlug] = useState(() => {
    try {
      return localStorage.getItem(BOOK_KEY) ?? 'covenant'
    } catch {
      return 'covenant'
    }
  })
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const toast = useCallback((m: string) => {
    clearTimeout(toastTimer.current)
    setToastMsg(m)
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200)
  }, [])

  // Role and the books this console can edit.
  useEffect(() => {
    if (!user) return
    let live = true
    supabase
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle<{ role: Role }>()
      .then(async ({ data }) => {
        if (!live) return
        if (!data) return setRole(null)
        const { data: list } = await supabase
          .from('books')
          .select('slug, title, config')
          .eq('config->>reader', 'prayer')
          .eq('config->>schedule', 'fixed')
          .order('sort_hint')
        if (!live) return
        setBooks((list ?? []) as AdminBook[])
        setRole(data.role)
      })
    return () => {
      live = false
    }
  }, [user])

  const phase: Phase = !ready ? 'loading' : !user ? 'signin' : role === undefined ? 'loading' : role === null ? 'denied' : 'ready'
  const signOut = () => void auth.signOutQuiet()

  if (phase === 'loading') return <div className="adm-loading">Loading…</div>
  if (phase === 'signin') return <SignIn />
  if (phase === 'denied')
    return (
      <Center>
        <h1 className="adm-h1 small">No admin access</h1>
        <p className="muted">{user?.email} isn’t an editor or admin. Ask an admin to give you access from the Users tab.</p>
        <div className="adm-row">
          <a className="btn btn-secondary" href="#/">
            Open the book
          </a>
          <button className="btn btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </Center>
    )

  const book = books.find((b) => b.slug === slug) ?? books[0]
  if (!book) return <Center>No books to edit yet.</Center>
  const pickBook = (s: string) => {
    setSlug(s)
    try {
      localStorage.setItem(BOOK_KEY, s)
    } catch {
      // private mode
    }
  }
  const isAdmin = role === 'admin'
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <AdminContext.Provider value={{ me: user!.email ?? '', userId: user!.id, role: role!, books, book, pickBook, toast }}>
      <div className="adm">
        <header className="adm-hdr">
          <div className="adm-bar">
            <div className="adm-brand">
              <Logo kind="mark" className="adm-mark" />
              <div>
                <span className="adm-title">Admin Console</span>
                <span className="adm-role">{isAdmin ? 'Admin' : 'Editor'}</span>
              </div>
            </div>
            <select className="input adm-book" aria-label="Book" value={book.slug} onChange={(e) => pickBook(e.target.value)}>
              {books.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.title}
                </option>
              ))}
            </select>
            <nav aria-label="Sections" className="adm-tabs">
              {tabs.map((t) => (
                <NavLink key={t.path} to={`/admin/${t.path}`} className={({ isActive }) => (isActive ? 'on' : '')}>
                  {t.label}
                </NavLink>
              ))}
            </nav>
            <span className="spacer" />
            <div className="adm-tools">
              <a href="#/" target="_blank" rel="noopener">
                Open book
              </a>
              <button className="btn btn-ghost" onClick={signOut} title={user!.email ?? ''}>
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="adm-main">
          <Routes>
            <Route path="content" element={<Placeholder name="Content" />} />
            <Route path="weekly" element={<Placeholder name="Weekly" />} />
            {isAdmin && <Route path="users" element={<Placeholder name="Users" />} />}
            <Route path="translations" element={<Placeholder name="Translations" />} />
            <Route path="insights" element={<Placeholder name="Insights" />} />
            <Route path="history" element={<Placeholder name="History" />} />
            <Route path="*" element={<Navigate to="/admin/content" replace />} />
          </Routes>
        </main>
        {toastMsg && (
          <div className="toast" role="status">
            {toastMsg}
          </div>
        )}
      </div>
    </AdminContext.Provider>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !pw) return setErr('Enter your email and password.')
    setBusy(true)
    setErr('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      if (error) setErr(/invalid login/i.test(error.message) ? 'That email or password isn’t right.' : error.message)
    } catch {
      setErr('You appear to be offline.')
    }
    setBusy(false)
  }
  return (
    <Center>
      <form className="adm-signin" onSubmit={submit}>
        <Logo kind="full" className="adm-signin-logo" />
        <div className="adm-signin-head">
          <h1 className="adm-h1">Admin Console</h1>
          <span className="muted adm-sub">Overcomer’s Library</span>
        </div>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => (setEmail(e.target.value), setErr(''))} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => (setPw(e.target.value), setErr(''))} />
        </label>
        {err && (
          <div role="alert" className="lock-error">
            {err}
          </div>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted adm-note">
          Use the same account you use in the book. <a href="#/">Open the book</a>
        </p>
      </form>
    </Center>
  )
}

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="adm-center">
      <div className="adm-center-inner">{children}</div>
    </div>
  )
}

function Placeholder({ name }: { name: string }) {
  return <p className="muted adm-pad">{name}</p>
}
