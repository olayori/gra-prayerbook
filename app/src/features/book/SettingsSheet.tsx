import Sheet from '../../components/Sheet.tsx'
import { auth, isGuest, useAuth } from '../../lib/auth.ts'
import { FONTS, useSettings, type Settings } from '../../lib/settings.ts'
import type { BookStore, SyncState } from './store.ts'

// The design's "Aa" sheet. Not yet ported: language, read-aloud voice.
export default function SettingsSheet({ store, onClose }: { store: BookStore; onClose: () => void }) {
  const { settings: st, set } = useSettings()
  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="settings">
        <Account store={store} onClose={onClose} />
        <Group label="Text size" cols={6}>
          {([[15, 14, 'Small'], [17, 17, 'Medium'], [19, 20, 'Large'], [22, 23, 'Extra large'], [25, 26, 'Larger'], [29, 30, 'Largest']] as const).map(
            ([v, fs, aria]) => (
              <Opt key={v} on={st.size === v} onPick={() => set({ size: v })} aria={aria} style={{ fontFamily: 'var(--font-heading)', fontSize: fs, minHeight: 48 }}>
                A
              </Opt>
            ),
          )}
        </Group>
        <Group label="Line spacing" cols={3}>
          {([[1.45, 'Compact'], [1.6, 'Normal'], [1.85, 'Relaxed']] as const).map(([v, label]) => (
            <Opt key={v} on={st.lh === v} onPick={() => set({ lh: v })}>
              {label}
            </Opt>
          ))}
        </Group>
        <Group label="Reading font" cols={3}>
          {([['book', 'Book'], ['clean', 'Clean'], ['easy', 'Easy read']] as const).map(([v, label]) => (
            <Opt key={v} on={st.font === v} onPick={() => set({ font: v })} style={{ fontFamily: FONTS[v], minHeight: 48 }}>
              {label}
            </Opt>
          ))}
        </Group>
        <Group label="Letter spacing" cols={2}>
          {([['normal', 'Normal', 'normal'], ['wide', 'Wide', '.06em']] as const).map(([v, label, ls]) => (
            <Opt key={v} on={st.ls === v} onPick={() => set({ ls: v })} style={{ letterSpacing: ls, minHeight: 48 }}>
              {label}
            </Opt>
          ))}
        </Group>
        <Group label="Page" cols={4}>
          {(
            [
              ['light', 'Light', '#f3f2f2'],
              ['sepia', 'Sepia', '#f3ead6'],
              ['dark', 'Dark', '#1a1714'],
              ['auto', 'Auto', 'linear-gradient(90deg, #f3f2f2 50%, #1a1714 50%)'],
            ] as const
          ).map(([v, label, sw]) => (
            <Opt
              key={v}
              on={st.theme === v}
              onPick={() => set(v === 'light' || v === 'sepia' ? { theme: v, lastLight: v } : { theme: v as Settings['theme'] })}
            >
              <span className="swatch" style={{ background: sw }} />
              {label}
            </Opt>
          ))}
        </Group>
        <Group label="Scripture under each prayer" cols={2}>
          {([[true, 'Show'], [false, 'Hide']] as const).map(([v, label]) => (
            <Opt key={label} on={st.verses === v} onPick={() => set({ verses: v })} style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16 }}>
              {label}
            </Opt>
          ))}
        </Group>
      </div>
    </Sheet>
  )
}

function Group({ label, cols, children }: { label: string; cols: number; children: React.ReactNode }) {
  return (
    <div className="setting">
      <span className="setting-label">{label}</span>
      <div className="seg-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {children}
      </div>
    </div>
  )
}

function Opt(props: { on: boolean; onPick: () => void; aria?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <button className={props.on ? 'seg-opt-btn on' : 'seg-opt-btn'} onClick={props.onPick} aria-pressed={props.on} aria-label={props.aria} style={props.style}>
      {props.children}
    </button>
  )
}

function syncLabel(sync: SyncState, at: number | null) {
  if (sync === 'syncing') return 'Syncing…'
  if (sync === 'offline') return 'Offline. Changes will sync when you’re back online.'
  if (sync === 'error') return 'Couldn’t sync. Tap Sync now to retry.'
  if (sync === 'ok') {
    const ago = at ? Math.round((Date.now() - at) / 60000) : 0
    return `Synced ${ago < 1 ? 'just now' : ago === 1 ? '1 minute ago' : ago < 60 ? `${ago} minutes ago` : 'over an hour ago'}`
  }
  return 'Progress syncs across your devices'
}

function Account({ store, onClose }: { store: BookStore; onClose: () => void }) {
  const { user } = useAuth()
  if (user) {
    const signOut = async () => {
      if (!window.confirm('Sign out on this device? Your progress is saved to your account.')) return
      if (store.hasUnsynced() && !(await store.push()) && !window.confirm('Some recent changes haven’t synced yet and will be lost on this device. Sign out anyway?')) return
      onClose()
      await auth.signOutQuiet()
    }
    return (
      <div className="account">
        <span className="setting-label">Account</span>
        <div className="account-row">
          <div className="account-who">
            <span className="account-email">{user.email}</span>
            <span className="account-sync">{syncLabel(store.sync, store.syncAt)}</span>
          </div>
          <button className="btn btn-secondary" onClick={() => void store.pull()}>
            Sync now
          </button>
        </div>
        <button className="btn btn-ghost" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    )
  }
  if (!isGuest()) return null
  return (
    <div className="account">
      <span className="setting-label">Account</span>
      <p>You’re using an access code. Your progress is saved on this device only. Create an account to keep it in sync on your phone and iPad.</p>
      <button
        className="btn btn-secondary"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => {
          onClose()
          auth.toAccount()
        }}
      >
        Sign in or create account
      </button>
    </div>
  )
}
