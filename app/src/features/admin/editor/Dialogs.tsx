import { useState } from 'react'
import type { Verse } from '../../book/types.ts'
import { useAdmin } from '../context.ts'
import Dialog from './Dialog.tsx'
import { useEditor } from './EditorContext.ts'
import { locPrayer, locSection, partLabel, setScripture, titleCase } from './engine.ts'
import { snip, type MoveTarget, type ScrTarget } from './ui.ts'

// Add or edit one scripture on a section's foundation or a prayer (design: openScr/saveScr).
export function ScriptureDialog({ target, onClose }: { target: ScrTarget; onClose: () => void }) {
  const { store } = useEditor()
  const { toast } = useAdmin()
  const d = store.draft!
  const list = target.owner === 'f' ? locSection(d, target.ownerU)!.s.foundation : locPrayer(d, target.ownerU)!.pr.scripture
  const sc = target.idx >= 0 ? list[target.idx] : null
  const [ref, setRef] = useState(sc?.ref ?? '')
  const [verses, setVerses] = useState<Verse[]>(sc ? JSON.parse(JSON.stringify(sc.verses || [])) : [{ n: '', text: '' }])

  const where = () => {
    if (target.owner === 'f') {
      const L = locSection(d, target.ownerU)!
      return `section ${L.pi + 1}.${L.si + 1} foundation`
    }
    const L = locPrayer(d, target.ownerU)!
    return `prayer ${L.pi + 1}.${L.si + 1}.${L.i + 1}`
  }
  const save = (remove: boolean) => {
    const r = ref.trim(), vs = verses.map((v) => ({ n: String(v.n).trim(), text: v.text.trim() })).filter((v) => v.text)
    if (!remove && !r) return toast('Add a reference first')
    const what = remove ? `Removed ${ref || 'scripture'} from ${where()}` : target.idx < 0 ? `Added ${r} to ${where()}` : `Edited ${r} in ${where()}`
    store.edit(what, null, (x) => setScripture(x, target.owner, target.ownerU, target.idx, remove ? null : { ref: r, verses: vs }))
    onClose()
  }
  const setVerse = (k: number, patch: Partial<Verse>) => setVerses(verses.map((v, j) => (j === k ? { ...v, ...patch } : v)))

  return (
    <Dialog title={target.idx < 0 ? 'Add scripture' : 'Edit scripture'} width={620} onClose={onClose}>
      <div className="adm-col" style={{ gap: 14 }}>
        <label className="field">
          <span>Reference</span>
          <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. Psalm 91:1–2" />
        </label>
        <span className="adm-eyebrow">Verses</span>
        {verses.map((v, k) => (
          <div key={k} className="adm-verse">
            <input className="input" value={v.n} onChange={(e) => setVerse(k, { n: e.target.value })} aria-label="Verse number" />
            <textarea className="input" rows={3} value={v.text} onChange={(e) => setVerse(k, { text: e.target.value })} aria-label="Verse text" />
            <button className="adm-icon" aria-label="Remove verse" onClick={() => setVerses(verses.filter((_, j) => j !== k))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setVerses([...verses, { n: '', text: '' }])}>
          + Add verse
        </button>
        <div className="adm-actions spread">
          {target.idx >= 0 && (
            <button className="btn btn-ghost" onClick={() => save(true)}>
              Remove scripture
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => save(false)}>
            Save
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// Move a section to another part, or a prayer to another section (to the end).
export function MoveDialog({ target, onClose, onMove }: { target: NonNullable<MoveTarget>; onClose: () => void; onMove: (to: string) => void }) {
  const { store, setSel } = useEditor()
  const d = store.draft!
  const isSec = target.kind === 'section'
  const [to, setTo] = useState(target.target)
  const opts = isSec
    ? d.map((p, pi) => ({ u: p.u, label: `${partLabel(pi)} · ${titleCase(p.title)}` }))
    : d.flatMap((p, pi) => p.sections.map((s, si) => ({ u: s.u, label: `${pi + 1}.${si + 1} · ${s.title}` })))
  const what = (() => {
    if (isSec) {
      const L = locSection(d, target.u)
      return L ? `Section ${L.pi + 1}.${L.si + 1} · ${L.s.title}` : ''
    }
    const L = locPrayer(d, target.u)
    return L ? `Prayer ${L.pi + 1}.${L.si + 1}.${L.i + 1} · ${snip(L.pr.text)}` : ''
  })()
  return (
    <Dialog title={isSec ? 'Move section' : 'Move prayer'} onClose={onClose}>
      <div className="adm-col" style={{ gap: 16 }}>
        <p className="adm-p">{what}</p>
        <label className="field">
          <span>{isSec ? 'Move to the end of' : 'Move to the end of section'}</span>
          <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
            {opts.map((o) => (
              <option key={o.u} value={o.u}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="adm-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onClose()
              if (to !== target.target) {
                onMove(to)
                if (isSec) setSel({ kind: 'section', u: target.u })
              }
            }}
          >
            Move
          </button>
        </div>
      </div>
    </Dialog>
  )
}
