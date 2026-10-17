import { useState, useSyncExternalStore } from 'react'
import { useAdmin } from '../context.ts'
import Dialog from './Dialog.tsx'
import { useEditor } from './EditorContext.ts'

const LINES: [string, string][] = [
  ['pAdd', 'Prayers added'], ['pEdit', 'Prayers edited'], ['pMove', 'Prayers moved to another section'], ['pDel', 'Prayers removed'],
  ['sAdd', 'Sections added'], ['sEdit', 'Sections renamed or changed'], ['sDel', 'Sections removed'],
  ['partAdd', 'Parts added'], ['partEdit', 'Parts renamed or reordered'], ['partDel', 'Parts removed'],
]

export default function PublishDialog({ onClose, onGoContent }: { onClose: () => void; onGoContent: () => void }) {
  const { store, setSel, focusPrayer } = useEditor()
  const { toast } = useAdmin()
  useSyncExternalStore(store.subscribe, () => store.version)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const df = store.changes, pr = store.problems
  const lines = df.st ? LINES.map(([k, label]) => ({ label, n: (df.st as Record<string, number>)[k] })).filter((x) => x.n) : []

  const publish = async () => {
    setBusy(true)
    setErr('')
    const r = await store.publish(note)
    setBusy(false)
    if (r.ok) {
      onClose()
      toast(`Version ${r.version} published`)
    } else if (r.error) setErr(r.error)
    else onClose()
  }
  const discard = () => {
    if (!window.confirm(`Discard every unpublished change and go back to version ${store.pubV}?`)) return
    store.discard()
    onClose()
  }

  return (
    <Dialog title="Publish changes" onClose={onClose}>
      <div className="adm-col" style={{ gap: 18 }}>
        {!df.total ? (
          <p className="adm-p">There are no changes since version {store.pubV}.</p>
        ) : (
          <div className="adm-lines">
            {lines.map((l) => (
              <div key={l.label}>
                <span>{l.label}</span>
                <span className="accent">{l.n}</span>
              </div>
            ))}
          </div>
        )}
        {pr.length > 0 && (
          <div role="alert" className="adm-problems">
            <span className="adm-eyebrow accent">Fix before publishing</span>
            {pr.slice(0, 8).map((x) => (
              <button
                key={x.label + (x.fu ?? '')}
                onClick={() => {
                  onClose()
                  onGoContent()
                  setSel(x.sel)
                  if (x.fu) focusPrayer(x.fu)
                }}
              >
                {x.label}
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span>Note for the history (optional)</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Added prayers for the youth convention" />
        </label>
        <p className="adm-small">
          Readers get version {store.pubV + 1} the next time they open the book online. Their check marks, favorites and bookmarks follow each prayer to its new place.
        </p>
        {err && (
          <div role="alert" className="lock-error">
            {err}
          </div>
        )}
        <div className="adm-actions spread">
          <button className="btn btn-ghost" onClick={discard} disabled={!df.total}>
            Discard all changes
          </button>
          <div className="adm-row">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void publish()} disabled={!df.total || pr.length > 0 || busy}>
              {busy ? 'Publishing…' : `Publish version ${store.pubV + 1}`}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
