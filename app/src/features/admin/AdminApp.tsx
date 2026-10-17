import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router'
import { auth, useAuth } from '../../lib/auth.ts'
import { supabase } from '../../lib/supabase.ts'
import Logo from '../book/Logo.tsx'
import './admin.css'
import { AdminContext, useAdmin, type AdminBook, type Role } from './context.ts'
import ContentTab from './editor/ContentTab.tsx'
import { DraftStore } from './editor/draftStore.ts'
import { EditorContext, type Sel } from './editor/EditorContext.ts'
import PublishDialog from './editor/PublishDialog.tsx'
import HistoryTab from './HistoryTab.tsx'
import InsightsTab from './insights/InsightsTab.tsx'
import TranslationsTab from './TranslationsTab.tsx'
import UsersTab from './users/UsersTab.tsx'
import WeeklyTab from './weekly/WeeklyTab.tsx'

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

  const leave = useRef<string | null>(null)
  const holdLeave = useCallback((q: string | null) => void (leave.current = q), [])
  const leaving = useCallback(() => leave.current, [])

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
  return (
    <AdminContext.Provider value={{ me: user!.email ?? '', userId: user!.id, role: role!, books, book, pickBook, toast, holdLeave, leaving }}>
      <Ready key={book.slug} book={book} isAdmin={role === 'admin'} toastMsg={toastMsg} signOutNow={signOut} />
    </AdminContext.Provider>
  )
}

// The console for one book: its draft store, header tools and tabs.
function Ready({ book, isAdmin, toastMsg, signOutNow }: { book: AdminBook; isAdmin: boolean; toastMsg: string | null; signOutNow: () => void }) {
  const { me, books, pickBook, holdLeave, leaving } = useAdmin()
  const navigate = useNavigate()
  const keepExtras = book.config.content.includes('names') || book.config.content.includes('embed')
  const store = useMemo(() => new DraftStore(supabase, book.slug, me, keepExtras), [book.slug, me, keepExtras])
  useSyncExternalStore(store.subscribe, () => store.version)
  const [sel, setSel] = useState<Sel>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [loadErr, setLoadErr] = useState('')
  const [publishing, setPublishing] = useState(false)
  const focus = useRef<string | null>(null)

  useEffect(() => {
    store.load().then(
      () => {
        const p0 = store.draft?.[0], s0 = p0?.sections[0]
        setSel(s0 ? { kind: 'section', u: s0.u } : null)
        setOpen(p0 ? { [p0.u]: true } : {})
      },
      (e) => setLoadErr(`Couldn’t load the book. ${(e as Error)?.message ?? ''}`),
    )
    return () => {
      void store.flush()
      store.stop()
    }
  }, [store])

  // Ctrl/⌘-Z and Shift-Ctrl/⌘-Z undo and redo when not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement | null)?.tagName
      const typing = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing && store.draft) {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
      }
    }
    // Ask before leaving with changes that aren't saved yet.
    const onLeave = (e: BeforeUnloadEvent) => {
      if (store.save !== 'saved' || leaving()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    addEventListener('keydown', onKey)
    addEventListener('beforeunload', onLeave)
    return () => {
      removeEventListener('keydown', onKey)
      removeEventListener('beforeunload', onLeave)
    }
  }, [store, leaving])

  // Ask before dropping a tab's unsaved work; true when it's fine to go.
  const mayLeave = () => {
    const q = leaving()
    if (q && !window.confirm(q)) return false
    holdLeave(null)
    return true
  }

  const signOut = () => {
    if (store.save !== 'saved' && !window.confirm('Some changes aren’t saved yet. Sign out anyway?')) return
    if (!mayLeave()) return
    signOutNow()
  }
  const switchBook = async (s: string) => {
    if (!mayLeave()) return
    await store.flush()
    pickBook(s)
  }

  const editor = useMemo(
    () => ({
      store,
      sel,
      setSel,
      open,
      setOpen,
      focusPrayer: (u: string) => void (focus.current = u),
      takeFocus: () => {
        const u = focus.current
        focus.current = null
        return u
      },
    }),
    [store, sel, open],
  )

  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin)
  const df = store.changes
  const saveLabel =
    store.save === 'saving' ? 'Saving…' : store.save === 'unsaved' ? 'Unsaved changes' : store.save === 'error' ? 'Couldn’t save · retrying' : store.savedOnce ? 'Draft saved' : 'Draft up to date'
  const canUndo = store.history.canUndo, canRedo = store.history.canRedo

  return (
    <EditorContext.Provider value={editor}>
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
            <select className="input adm-book" aria-label="Book" value={book.slug} onChange={(e) => void switchBook(e.target.value)}>
              {books.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.title}
                </option>
              ))}
            </select>
            <nav aria-label="Sections" className="adm-tabs">
              {tabs.map((t) => (
                <NavLink key={t.path} to={`/admin/${t.path}`} onClick={(e) => !mayLeave() && e.preventDefault()} className={({ isActive }) => (isActive ? 'on' : '')}>
                  {t.label}
                </NavLink>
              ))}
            </nav>
            <span className="spacer" />
            <div className="adm-tools">
              <span className={store.save === 'error' ? 'adm-save accent' : 'adm-save'}>{saveLabel}</span>
              <button className="adm-icon" onClick={() => store.undo()} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" style={{ opacity: canUndo ? 1 : 0.35 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
              </button>
              <button className="adm-icon" onClick={() => store.redo()} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" style={{ opacity: canRedo ? 1 : 0.35 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
              </button>
              <button className="btn btn-primary adm-publish" onClick={() => setPublishing(true)} disabled={!store.draft}>
                Publish{df.total > 0 && <span className="adm-badge">{df.total}</span>}
              </button>
              <span className="adm-sep" />
              <a href="#/" target="_blank" rel="noopener">
                Open book
              </a>
              <button className="btn btn-ghost" onClick={signOut} title={me}>
                Sign out
              </button>
            </div>
          </div>
          {store.conflict && (
            <div role="alert" className="adm-conflict">
              <span>Someone else changed the draft while you were editing. Your recent changes aren’t saved. Reload to see theirs.</span>
              <button className="btn btn-secondary" onClick={() => void store.reload()}>
                Reload draft
              </button>
            </div>
          )}
        </header>
        <main className="adm-main">
          {loadErr ? (
            <p className="adm-pad">{loadErr}</p>
          ) : !store.draft ? (
            <div className="adm-loading short">Opening the book…</div>
          ) : (
            <Routes>
              <Route path="content" element={<ContentTab />} />
              <Route path="weekly" element={<WeeklyTab />} />
              {isAdmin && <Route path="users" element={<UsersTab />} />}
              <Route path="translations" element={<TranslationsTab />} />
              <Route path="insights" element={<InsightsTab />} />
              <Route path="history" element={<HistoryTab />} />
              <Route path="*" element={<Navigate to="/admin/content" replace />} />
            </Routes>
          )}
        </main>
        {publishing && <PublishDialog onClose={() => setPublishing(false)} onGoContent={() => navigate('/admin/content')} />}
        {toastMsg && (
          <div className="toast" role="status">
            {toastMsg}
          </div>
        )}
      </div>
    </EditorContext.Provider>
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
