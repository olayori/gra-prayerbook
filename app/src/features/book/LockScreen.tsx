import { useState, type FormEvent } from 'react'
import { auth, useAuth, type AuthMode } from '../../lib/auth.ts'
import Logo from './Logo.tsx'

// The book gate (design/src/book/template.html, `locked`), with labels from authVals().
const HEADING: Partial<Record<AuthMode, string>> = { code: 'One more step', reset: 'Reset your password', newpw: 'Choose a new password' }
const SUB: Partial<Record<AuthMode, string>> = {
  code: 'Enter the registration code from GRA to open the book on this account.',
  reset: 'We’ll email you a link to set a new password.',
  newpw: 'Use at least 8 characters.',
}
const SUBMIT: Record<AuthMode, string> = { in: 'Sign in', up: 'Create account', code: 'Continue', reset: 'Send reset link', newpw: 'Save password' }

// onClose: shown for free books, where signing in is optional (adds sync).
export default function LockScreen({ title, onClose }: { title: string; onClose?: () => void }) {
  const a = useAuth()
  const [f, setF] = useState({ email: '', password: '', name: '', code: '' })
  const m = a.mode, inn = m === 'in', up = m === 'up'
  const field = (k: keyof typeof f) => ({
    name: k,
    value: f[k],
    onChange: (e: { target: { value: string } }) => {
      setF({ ...f, [k]: e.target.value })
      auth.clearError()
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    void auth.submit(f).then(() => setF((x) => ({ ...x, password: '', code: '' })))
  }

  return (
    <div className="lock">
      <div className="lock-inner">
        <div className="lock-logo">
          <Logo kind="full" alt="God’s Remnant Assembly — Citadel of Miracles" />
        </div>
        <h1>{title}</h1>
        <div className="lock-rule" />

        <div className="lock-auth">
          {(inn || up) && (
            <div className="seg-grid lock-tabs">
              <button className={inn ? 'seg-opt-btn on' : 'seg-opt-btn'} onClick={() => auth.setMode('in')} aria-pressed={inn}>
                Sign in
              </button>
              <button className={up ? 'seg-opt-btn on' : 'seg-opt-btn'} onClick={() => auth.setMode('up')} aria-pressed={up}>
                Create account
              </button>
            </div>
          )}
          {HEADING[m] && (
            <div className="lock-heading">
              <h2>{HEADING[m]}</h2>
              <p>{SUB[m]}</p>
            </div>
          )}
          <form onSubmit={submit} className="lock-form">
            {up && (
              <label>
                <span>Your name</span>
                <input className="input" autoComplete="name" {...field('name')} />
              </label>
            )}
            {(inn || up || m === 'reset') && (
              <label>
                <span>Email</span>
                <input className="input" type="email" autoComplete="email" autoCapitalize="off" {...field('email')} />
              </label>
            )}
            {(inn || up || m === 'newpw') && (
              <label>
                <span>{m === 'newpw' ? 'New password' : 'Password'}</span>
                <input className="input" type="password" autoComplete={inn ? 'current-password' : 'new-password'} {...field('password')} />
              </label>
            )}
            {(up || m === 'code') && (
              <label>
                <span>Registration code</span>
                <input className="input" type="password" autoComplete="off" {...field('code')} />
              </label>
            )}
            {a.error && (
              <div role="alert" className="lock-error">
                {a.error}
              </div>
            )}
            {a.message && (
              <div role="status" className="lock-msg">
                {a.message}
              </div>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={a.busy}>
              {a.busy ? 'Please wait…' : SUBMIT[m]}
            </button>
          </form>
          {inn && (
            <button className="lock-link" onClick={() => auth.setMode('reset')}>
              Forgot password?
            </button>
          )}
          {m === 'code' && (
            <button className="lock-link" onClick={() => void auth.signOutQuiet()}>
              Use a different account
            </button>
          )}
          {m === 'reset' && (
            <button className="lock-link" onClick={() => auth.setMode('in')}>
              Back to sign in
            </button>
          )}
          {onClose && (
            <button className="lock-link" onClick={onClose}>
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
