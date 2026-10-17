import { useEffect, useRef, useSyncExternalStore } from 'react'
import { snip, type DnD, type Look, type MoveTarget, type ScrTarget } from './ui.ts'
import { useEditor } from './EditorContext.ts'
import {
  addPrayer, addSection, deletePart, deletePrayer, deleteSection, locPart, locSection, newId, partLabel, setPartSubtitle, setPartTitle,
  setPrayerText, setSectionTitle, swapPrayer, titleCase,
} from './engine.ts'

type SectionProps = { u: string; q: string; dnd: DnD; look: Look; onScripture: (t: ScrTarget) => void; onMove: (t: MoveTarget) => void }

export function SectionEditor({ u: su, q, dnd, look, onScripture, onMove }: SectionProps) {
  const { store, setSel, takeFocus, focusPrayer } = useEditor()
  useSyncExternalStore(store.subscribe, () => store.version)
  const L = locSection(store.draft!, su)!
  const { pi, si, s, p } = L
  const n = s.prayers.length
  const flag = store.changes.flag
  const box = useRef<HTMLDivElement>(null)

  // Focus a prayer that was just added or picked from the publish problems.
  useEffect(() => {
    const fu = takeFocus()
    if (fu) box.current?.querySelector<HTMLTextAreaElement>(`textarea[data-u="${fu}"]`)?.focus()
  })

  const add = (at?: number) => {
    const u = newId('p')
    store.edit(`Added a prayer to section ${pi + 1}.${si + 1}`, null, (d) => addPrayer(d, su, u, at))
    focusPrayer(u)
  }

  return (
    <div className="adm-sec-ed" ref={box}>
      <div className="adm-col" style={{ gap: 8 }}>
        <div className="adm-row wrap">
          <span className="adm-kicker">{`${partLabel(pi)} · Section ${pi + 1}.${si + 1}`}</span>
          <button className="btn btn-ghost" onClick={() => onMove({ kind: 'section', u: su, target: p.u })}>
            Move to part…
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!window.confirm(`Delete section ${pi + 1}.${si + 1} “${s.title}” and its ${n} ${n === 1 ? 'prayer' : 'prayers'}? You can undo this until you publish.`)) return
              store.edit(`Deleted section “${s.title}”`, null, (d) => deleteSection(d, su))
              setSel({ kind: 'part', u: p.u })
            }}
          >
            Delete section
          </button>
        </div>
        <input
          className="adm-big-title"
          value={s.title}
          aria-label="Section title"
          placeholder="Section title"
          onChange={(e) => store.edit(`Renamed section ${pi + 1}.${si + 1}`, `s:${su}`, (d) => setSectionTitle(d, su, e.target.value))}
        />
      </div>

      <section className="adm-col">
        <div className="adm-sub-head">
          <span className="adm-eyebrow">Scripture foundation</span>
          <button className="btn btn-ghost" onClick={() => onScripture({ owner: 'f', ownerU: su, idx: -1 })}>
            + Add scripture
          </button>
        </div>
        {!s.foundation.length && <p className="adm-small" style={{ marginTop: 12 }}>No foundation scriptures for this section.</p>}
        {s.foundation.map((f, k) => (
          <button key={k} className="adm-found" onClick={() => onScripture({ owner: 'f', ownerU: su, idx: k })}>
            <span className="adm-ref">{f.ref || 'No reference'}</span>
            <span className="adm-found-text">{(f.verses || []).map((v) => v.text).join(' ')}</span>
            <span className="accent adm-small">Edit</span>
          </button>
        ))}
      </section>

      <section className="adm-col">
        <div className="adm-sub-head">
          <span className="adm-eyebrow">{`Prayers · ${n}`}</span>
          <span className="adm-small">Drag the handle to reorder, or drop on a section in the outline</span>
        </div>
        {s.prayers.map((pr, i) => {
          const u = pr.u, num = `${pi + 1}.${si + 1}.${i + 1}`, lk = look(u), hit = !!q && pr.text.toLowerCase().includes(q)
          const rows = Math.max(2, Math.ceil(pr.text.length / 80) + (pr.text.match(/\n/g) || []).length)
          const swap = (dir: -1 | 1) => store.edit(`Reordered prayers in ${pi + 1}.${si + 1}`, null, (d) => swapPrayer(d, u, dir))
          return (
            <div key={u} className="adm-prayer" onDragOver={(e) => dnd.over('prayer', u, e)} onDrop={(e) => dnd.drop('prayer', u, e)} style={{ background: lk.hot || hit ? 'var(--color-accent-100)' : undefined, boxShadow: lk.line }}>
              <div className="adm-prayer-gutter">
                <span className="adm-handle" draggable onDragStart={(e) => dnd.start('prayer', u, e)} onDragEnd={dnd.end} title="Drag to move" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.6" /><circle cx="15" cy="5" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="19" r="1.6" /><circle cx="15" cy="19" r="1.6" /></svg>
                </span>
                <span className="accent adm-pnum">{num}</span>
              </div>
              <div className="adm-col" style={{ gap: 10, minWidth: 0 }}>
                <textarea
                  className="input adm-ptext"
                  data-u={u}
                  rows={rows}
                  value={pr.text}
                  aria-label={`Prayer ${num}`}
                  placeholder="Write the prayer…"
                  onChange={(e) => store.edit(`Edited prayer ${num}`, `p:${u}`, (d) => setPrayerText(d, u, e.target.value))}
                />
                <div className="adm-row wrap" style={{ gap: 6 }}>
                  {pr.scripture.map((sc, k) => (
                    <button key={k} className="adm-chip" onClick={() => onScripture({ owner: 'p', ownerU: u, idx: k })}>
                      {sc.ref || 'Scripture'}
                    </button>
                  ))}
                  <button className="adm-link" onClick={() => onScripture({ owner: 'p', ownerU: u, idx: -1 })}>
                    + Scripture
                  </button>
                  <span className="spacer" />
                  {flag[u] && <span className="tag tag-accent">{flag[u]}</span>}
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => i > 0 && swap(-1)} d="m18 15-6-6-6 6" />
                  <IconBtn label="Move down" disabled={i === n - 1} onClick={() => i < n - 1 && swap(1)} d="m6 9 6 6 6-6" />
                  <IconBtn label="Add a prayer below" onClick={() => add(i + 1)} d="M5 12h14M12 5v14" />
                  <IconBtn label="Move to another section" onClick={() => onMove({ kind: 'prayer', u, target: su })} d="M5 12h14m-7-7 7 7-7 7" />
                  <IconBtn
                    label="Delete prayer"
                    onClick={() => {
                      if (pr.text.trim() && !window.confirm(`Delete prayer ${num}? You can undo this until you publish.`)) return
                      store.edit(`Deleted prayer ${num} ${snip(pr.text)}`, null, (d) => deletePrayer(d, u))
                    }}
                    d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  />
                </div>
              </div>
            </div>
          )
        })}
        <div style={{ paddingTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => add()}>
            + Add prayer
          </button>
        </div>
      </section>
    </div>
  )
}

export function PartEditor({ u: pu }: { u: string }) {
  const { store, setSel, open, setOpen } = useEditor()
  useSyncExternalStore(store.subscribe, () => store.version)
  const { pi, p } = locPart(store.draft!, pu)!
  const nS = p.sections.length, nP = p.sections.reduce((a, s) => a + s.prayers.length, 0)
  return (
    <div className="adm-sec-ed">
      <div className="adm-col" style={{ gap: 8 }}>
        <div className="adm-row">
          <span className="adm-kicker">{partLabel(pi)}</span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!window.confirm(`Delete ${partLabel(pi)} “${titleCase(p.title)}”${nS ? ` with ${nS} sections and ${nP} prayers` : ''}? You can undo this until you publish.`)) return
              store.edit(`Deleted ${partLabel(pi)} “${titleCase(p.title)}”`, null, (d) => deletePart(d, pu))
              setSel(null)
            }}
          >
            Delete part
          </button>
        </div>
        <input
          className="adm-big-title upper"
          value={p.title}
          aria-label="Part title"
          placeholder="Part title"
          onChange={(e) => store.edit(`Renamed ${partLabel(pi)}`, `pt:${pu}`, (d) => setPartTitle(d, pu, e.target.value))}
        />
        <span className="adm-small">The part number is set by its position. Part titles show in capitals, as in the printed book.</span>
      </div>
      <label className="field">
        <span>Subtitle</span>
        <textarea
          className="input adm-subtitle"
          rows={2}
          value={p.subtitle}
          onChange={(e) => store.edit(`Edited subtitle of ${partLabel(pi)}`, `ps:${pu}`, (d) => setPartSubtitle(d, pu, e.target.value))}
        />
      </label>
      <section className="adm-col">
        <div className="adm-sub-head">
          <span className="adm-eyebrow">{`Sections · ${nS}`}</span>
        </div>
        {p.sections.map((s, si) => (
          <button key={s.u} className="adm-part-sec" onClick={() => setSel({ kind: 'section', u: s.u })}>
            <span className="accent adm-pnum">{`${pi + 1}.${si + 1}`}</span>
            <span>{s.title}</span>
            <span className="adm-small">{`${s.prayers.length} prayers`}</span>
          </button>
        ))}
        <div style={{ paddingTop: 16 }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const u = newId('s')
              store.edit(`Added a section to ${partLabel(pi)}`, null, (d) => addSection(d, pu, u, newId('p')))
              setSel({ kind: 'section', u })
              setOpen({ ...open, [pu]: true })
            }}
          >
            + Add section
          </button>
        </div>
      </section>
    </div>
  )
}

function IconBtn({ label, d, onClick, disabled }: { label: string; d: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="adm-icon" aria-label={label} title={label} onClick={onClick} disabled={disabled} style={{ opacity: disabled ? 0.3 : 1 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </button>
  )
}
