import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import { load, remove, save } from './storage.ts'
import { supabase } from './supabase.ts'

// Sign-in and the members gate, ported from design/src/book/app.js (initAuth, onSession,
// authSubmit, signOut). Members-only books open for accounts that redeemed the GRA
// registration code; the server checks the code (redeem_code). Free books need no sign-in.
// The shared guest access code was removed (catalog design, 2026-10-16).

export type AuthMode = 'in' | 'up' | 'code' | 'reset' | 'newpw'

export type AuthState = {
  ready: boolean
  locked: boolean
  user: User | null
  isAdmin: boolean
  mode: AuthMode
  busy: boolean
  error: string
  message: string
}

const member = () => load<string | null>('gra-covenant-member', null)

function errText(e: unknown) {
  const m = (e as Error)?.message || ''
  if (/invalid login/i.test(m)) return 'That email or password isn’t right.'
  if (/not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox for the link.'
  if (/already registered|already been registered/i.test(m)) return 'An account with that email already exists. Sign in instead.'
  if (/fetch|network/i.test(m)) return 'You appear to be offline. Connect and try again.'
  return m || 'Something went wrong. Please try again.'
}

// Where email links (confirm, reset) come back to.
const here = () => location.origin + location.pathname

// Local progress for every book, cleared on sign-out (design: clearLocalBook).
const LOCAL_KEYS = ['prayed', 'fav', 'bookmarks', 'plan', 'ink', 'last', 'member', 'syncMeta', 'dirty', 'pendingCode', 'unlocked', 'hist', 'lastP', 'lastSess']

class AuthStore {
  state: AuthState = { ready: false, locked: !member(), user: null, isAdmin: false, mode: 'in', busy: false, error: '', message: '' }
  private listeners = new Set<() => void>()
  private started = false

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getState = () => this.state
  private set(patch: Partial<AuthState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((f) => f())
  }

  start() {
    if (this.started) return
    this.started = true
    supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') return this.set({ locked: true, mode: 'newpw', error: '', message: '' })
      setTimeout(() => void this.onSession(session, ev), 0)
    })
    supabase.auth.getSession().then(
      ({ data }) => {
        void this.onSession(data.session, 'INIT')
        if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash)
      },
      () => this.set({ ready: true }),
    )
  }

  private async onSession(session: Session | null, ev: string) {
    if (this.state.mode === 'newpw' && ev !== 'USER_UPDATED') return
    const u = session?.user ?? null
    if (!u) {
      if (ev === 'INIT' || ev === 'SIGNED_OUT') this.set({ ready: true, user: null, locked: true, busy: false })
      else this.set({ ready: true })
      return
    }
    if (this.state.user?.id === u.id && !this.state.locked) return
    let ok = member() === u.id
    if (!ok) {
      const { data } = await supabase.from('members').select('user_id').eq('user_id', u.id).maybeSingle()
      ok = !!data
      const pend = load<string | null>('gra-covenant-pendingCode', null)
      if (!ok && pend) ok = (await supabase.rpc('redeem_code', { code: pend })).data === true
      remove('gra-covenant-pendingCode')
    }
    if (!ok) return this.set({ ready: true, user: u, locked: true, mode: 'code', error: '', message: '', busy: false })
    save('gra-covenant-member', u.id)
    this.set({ ready: true, user: u, locked: false, busy: false, error: '', message: '' })
    supabase
      .from('admins')
      .select('role')
      .eq('user_id', u.id)
      .maybeSingle<{ role: string }>()
      .then(({ data }) => this.set({ isAdmin: !!data && ['admin', 'editor'].includes(data.role) }), () => {})
  }

  setMode = (mode: AuthMode) => this.set({ mode, error: '', message: '' })
  clearError = () => this.state.error && this.set({ error: '' })

  async submit(f: { email: string; password: string; name: string; code: string }) {
    const m = this.state.mode, email = f.email.trim(), pw = f.password
    this.set({ busy: true, error: '', message: '' })
    const fail = (t: string) => this.set({ busy: false, error: t })
    try {
      if (m === 'in') {
        if (!email || !pw) return fail('Enter your email and password.')
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
        if (error) return fail(errText(error))
        return
      }
      if (m === 'up') {
        if (!email) return fail('Enter your email.')
        if (pw.length < 8) return fail('Use a password of at least 8 characters.')
        if (!f.code.trim()) return fail('Enter the registration code from GRA.')
        // Redeemed by the server once the account exists (onSession → redeem_code).
        save('gra-covenant-pendingCode', f.code.trim())
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { data: { name: f.name.trim() }, emailRedirectTo: here() } })
        if (error) return fail(errText(error))
        if (!data.session) this.set({ busy: false, mode: 'in', message: `We sent a confirmation link to ${email}. Open it on this device to finish creating your account.` })
        return
      }
      if (m === 'code') {
        const { data, error } = await supabase.rpc('redeem_code', { code: f.code.trim() })
        if (error) return fail(errText(error))
        if (data !== true) return fail('That registration code isn’t right.')
        this.set({ user: null })
        const s = await supabase.auth.getSession()
        return this.onSession(s.data.session, 'CODE')
      }
      if (m === 'reset') {
        if (!email) return fail('Enter your email.')
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: here() })
        if (error) return fail(errText(error))
        return this.set({ busy: false, message: 'If that email has an account, a reset link is on its way.' })
      }
      if (m === 'newpw') {
        if (pw.length < 8) return fail('Use a password of at least 8 characters.')
        const { error } = await supabase.auth.updateUser({ password: pw })
        if (error) return fail(errText(error))
        this.set({ mode: 'in', user: null })
        const s = await supabase.auth.getSession()
        return this.onSession(s.data.session, 'USER_UPDATED')
      }
    } catch (e) {
      fail(errText(e))
    }
  }

  // Signs out and clears this device's progress for every book (it is saved to the account).
  async signOutQuiet() {
    try {
      await supabase.auth.signOut()
    } catch {
      // offline: the local session is still cleared below
    }
    LOCAL_KEYS.forEach((k) => ['gra-covenant-', 'gra-jcfp-', 'gra-weekly-'].forEach((px) => remove(px + k)))
    this.set({ user: null, isAdmin: false, locked: true, mode: 'in', error: '', message: '', busy: false })
  }

}

export const auth = new AuthStore()
export const AuthContext = createContext<AuthState>(auth.state)
export const useAuth = () => useContext(AuthContext)
