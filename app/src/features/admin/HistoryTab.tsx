import { useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { useAdmin } from './context.ts'
import { useEditor } from './editor/EditorContext.ts'

// History tab: the draft's change log and every published version, with restore and
// download (design/src/admin: historyVals, restoreVersion, downloadVersion).
const when = (t: number | string) => {
  const d = new Date(t)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function HistoryTab() {
  const { store, setSel } = useEditor()
  const { book, toast } = useAdmin()
  const navigate = useNavigate()
  useSyncExternalStore(store.subscribe, () => store.version)
  const total = store.changes.total
  const log = store.log.slice().reverse()

  const restore = async (v: number) => {
    if (!window.confirm(`Replace the current draft with ${v ? `version ${v}` : 'the original book'}? Unpublished changes will be replaced. You can undo this until you publish.`)) return
    try {
      await store.restore(v)
      setSel(null)
      navigate('/admin/content')
      toast('Restored to the draft. Review it, then publish.')
    } catch {
      toast('Couldn’t load that version')
    }
  }
  const download = async (v: number) => {
    try {
      const data = await store.versionData(v)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
      a.download = `${book.slug}-v${v}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      toast('Couldn’t download that version')
    }
  }
  const discard = () => {
    if (!window.confirm(`Discard every unpublished change and go back to version ${store.pubV}?`)) return
    store.discard()
  }

  return (
    <div className="adm-history">
      <section className="adm-col" style={{ gap: 12 }}>
        <div className="adm-sub-head">
          <span className="adm-eyebrow">Unpublished changes</span>
          <button className="btn btn-ghost" onClick={discard} disabled={!total}>
            Discard all changes
          </button>
        </div>
        <p className="adm-p">{total ? `${total} ${total === 1 ? 'change' : 'changes'} since version ${store.pubV}` : `No changes since version ${store.pubV}`}</p>
        {log.slice(0, 200).map((l, i) => (
          <div key={i} className="adm-log">
            <span>{l.what}</span>
            <span className="adm-small">
              {when(l.t)}
              {l.by ? ` · ${l.by}` : ''}
            </span>
          </div>
        ))}
      </section>
      <section className="adm-col" style={{ gap: 12 }}>
        <div className="adm-sub-head">
          <span className="adm-eyebrow">Published versions</span>
        </div>
        {store.versions.map((v) => {
          const st = v.stats ?? {}
          const meta = [v.published_by_email && `by ${v.published_by_email}`, st.parts != null && `${st.parts} parts · ${st.sections} sections · ${st.prayers} prayers`].filter(Boolean).join(' · ')
          return (
            <div key={v.version} className="adm-version">
              <div className="adm-col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <span className="adm-row">
                  <strong className="adm-ver-title">{v.version ? `Version ${v.version}` : 'Original book'}</strong>
                  {v.version === store.pubV && <span className="tag tag-accent">Live</span>}
                </span>
                <span className="adm-small">{v.version ? when(v.published_at) : 'Version 0'}</span>
                {(v.version === 0 || v.note) && <span className="adm-note-line">{v.version === 0 ? 'The book as first loaded into the app' : v.note}</span>}
                {meta && <span className="adm-small">{meta}</span>}
              </div>
              <button className="btn btn-ghost" onClick={() => void restore(v.version)}>
                Restore
              </button>
              <button className="btn btn-ghost" onClick={() => void download(v.version)}>
                Download
              </button>
            </div>
          )
        })}
      </section>
    </div>
  )
}
