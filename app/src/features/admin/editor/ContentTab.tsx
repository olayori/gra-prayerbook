import { useRef, useState, useSyncExternalStore } from 'react'
import { useEditor } from './EditorContext.ts'
import { move, partLabel, titleCase, type Draft, type Kind, type Pos } from './engine.ts'
import { MoveDialog, ScriptureDialog } from './Dialogs.tsx'
import { PartEditor, SectionEditor } from './Editors.tsx'
import { snip, type DnD, type Drop, type Look, type MoveTarget, type ScrTarget } from './ui.ts'

// Content tab: the book outline (search, expand, drag and drop) and the selected part or
// section's editor (design/src/admin: contentVals and the content markup).
export default function ContentTab() {
  const { store, sel, setSel, open, setOpen } = useEditor()
  useSyncExternalStore(store.subscribe, () => store.version)
  const [q, setQ] = useState('')
  const [dropAt, setDropAt] = useState<Drop>(null)
  const [scr, setScr] = useState<ScrTarget | null>(null)
  const [moving, setMoving] = useState<MoveTarget>(null)
  const drag = useRef<{ kind: Kind; u: string } | null>(null)
  const d = store.draft as Draft
  const df = store.changes

  const doMove = (kind: Kind, u: string, target: string, pos: Pos) => {
    const what =
      kind === 'part'
        ? 'Reordered parts'
        : kind === 'section'
          ? `Moved section “${d.flatMap((p) => p.sections).find((s) => s.u === u)?.title ?? ''}”`
          : `Moved prayer ${snip(d.flatMap((p) => p.sections.flatMap((s) => s.prayers)).find((x) => x.u === u)?.text ?? '')}`
    store.edit(what, null, (x) => move(x, kind, u, target, pos))
    if (kind === 'section' && pos === 'into') setOpen({ ...open, [target]: true })
  }

  const dnd: DnD = {
    start: (kind, u, e) => {
      drag.current = { kind, u }
      try {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', u)
      } catch {
        // some browsers refuse; dragging still works
      }
    },
    over: (kind, u, e) => {
      const g = drag.current
      if (!g || g.u === u) return
      const into = (g.kind === 'prayer' && kind === 'section') || (g.kind === 'section' && kind === 'part')
      if (!into && g.kind !== kind) return
      e.preventDefault()
      e.stopPropagation()
      const r = e.currentTarget.getBoundingClientRect()
      const pos: Pos = into ? 'into' : e.clientY < r.top + r.height / 2 ? 'before' : 'after'
      if (!dropAt || dropAt.u !== u || dropAt.pos !== pos) setDropAt({ u, pos })
    },
    drop: (_kind, u, e) => {
      e.preventDefault()
      e.stopPropagation()
      const g = drag.current
      drag.current = null
      const D = dropAt
      setDropAt(null)
      if (g && D && D.u === u && g.u !== u) doMove(g.kind, g.u, u, D.pos)
    },
    end: () => {
      drag.current = null
      if (dropAt) setDropAt(null)
    },
  }
  const look: Look = (u) =>
    !dropAt || dropAt.u !== u
      ? { line: 'none', hot: false }
      : { line: dropAt.pos === 'before' ? 'inset 0 2px 0 var(--color-accent)' : dropAt.pos === 'after' ? 'inset 0 -2px 0 var(--color-accent)' : 'inset 0 0 0 2px var(--color-accent)', hot: dropAt.pos === 'into' }

  const qq = q.trim().toLowerCase(), qOn = qq.length > 1
  const tree = d
    .map((p, pi) => {
      const secs = p.sections
        .map((s, si) => {
          const m = qOn ? s.prayers.filter((x) => x.text.toLowerCase().includes(qq)).length + (s.title.toLowerCase().includes(qq) ? 1 : 0) : 0
          return { s, si, m, show: !qOn || m > 0 }
        })
        .filter((x) => x.show)
      return { p, pi, secs, show: !qOn || secs.length > 0, isOpen: qOn ? secs.length > 0 : !!open[p.u] }
    })
    .filter((x) => x.show)
  const hits = tree.reduce((a, t) => a + t.secs.reduce((b, x) => b + x.m, 0), 0)

  const addPart = () => {
    const u = `pt${Date.now().toString(36)}`
    store.edit(`Added ${partLabel(d.length)}`, null, (x) => [...x, { u, title: 'NEW PART', subtitle: '', sections: [] }])
    setSel({ kind: 'part', u })
    setOpen({ ...open, [u]: true })
  }

  return (
    <div className="adm-content">
      <aside aria-label="Book outline" className="adm-outline">
        <div className="adm-outline-search">
          <input className="input" type="search" placeholder="Find a section or prayer" aria-label="Find" value={q} onChange={(e) => setQ(e.target.value)} />
          {qOn && <div className="adm-small">{hits ? `${hits} ${hits === 1 ? 'match' : 'matches'}` : 'No matches'}</div>}
        </div>
        <div className="adm-outline-list">
          {tree.map(({ p, pi, secs, isOpen }) => {
            const lk = look(p.u), selP = sel?.kind === 'part' && sel.u === p.u
            return (
              <div key={p.u}>
                <div
                  className="adm-part-row"
                  draggable
                  onDragStart={(e) => dnd.start('part', p.u, e)}
                  onDragOver={(e) => dnd.over('part', p.u, e)}
                  onDrop={(e) => dnd.drop('part', p.u, e)}
                  onDragEnd={dnd.end}
                  style={{ background: lk.hot ? 'var(--color-accent-100)' : selP ? 'var(--color-accent-200)' : 'transparent', boxShadow: lk.line }}
                >
                  <button className="adm-chev" onClick={() => setOpen({ ...open, [p.u]: !open[p.u] })} aria-label={isOpen ? 'Collapse' : 'Expand'} aria-expanded={isOpen}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${isOpen ? 90 : 0}deg)` }}><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                  <button className="adm-part-pick" onClick={() => (setSel({ kind: 'part', u: p.u }), setOpen({ ...open, [p.u]: true }))}>
                    <span className="adm-eyebrow accent">{partLabel(pi)}</span>
                    <span className="adm-part-title">{titleCase(p.title) || 'Untitled part'}</span>
                  </button>
                  <span className="adm-count">{p.sections.length}</span>
                </div>
                {isOpen && (
                  <>
                    {secs.map(({ s, si, m }) => {
                      const l2 = look(s.u), a = sel?.kind === 'section' && sel.u === s.u
                      return (
                        <div
                          key={s.u}
                          className="adm-sec-row"
                          draggable
                          onDragStart={(e) => dnd.start('section', s.u, e)}
                          onDragOver={(e) => dnd.over('section', s.u, e)}
                          onDrop={(e) => dnd.drop('section', s.u, e)}
                          onDragEnd={dnd.end}
                          onClick={() => setSel({ kind: 'section', u: s.u })}
                          style={{ background: l2.hot ? 'var(--color-accent-100)' : a ? 'var(--color-accent-200)' : undefined, boxShadow: l2.line }}
                        >
                          <span className="accent adm-num">{`${pi + 1}.${si + 1}`}</span>
                          <span className="adm-sec-title">{s.title || 'Untitled section'}</span>
                          <span className="adm-count">
                            {df.secFlag[s.u] && <span className="adm-dot" title="Changed since last publish" />}
                            {qOn ? `${m} found` : s.prayers.length}
                          </span>
                        </div>
                      )
                    })}
                    <button
                      className="adm-add-sec"
                      onClick={() => {
                        const u = `s${Date.now().toString(36)}`
                        store.edit(`Added a section to ${partLabel(pi)}`, null, (x) =>
                          x.map((pp) => (pp.u === p.u ? { ...pp, sections: [...pp.sections, { u, title: 'New section', foundation: [], prayers: [{ u: `p${Date.now().toString(36)}`, text: '', scripture: [] }] }] } : pp)),
                        )
                        setSel({ kind: 'section', u })
                      }}
                    >
                      + Add section
                    </button>
                  </>
                )}
              </div>
            )
          })}
          <div className="adm-pad-sm">
            <button className="btn btn-secondary btn-block" onClick={addPart}>
              + Add part
            </button>
          </div>
        </div>
      </aside>

      <section className="adm-editor">
        {sel?.kind === 'section' && d.some((p) => p.sections.some((s) => s.u === sel.u)) ? (
          <SectionEditor u={sel.u} q={qOn ? qq : ''} dnd={dnd} look={look} onScripture={setScr} onMove={setMoving} />
        ) : sel?.kind === 'part' && d.some((p) => p.u === sel.u) ? (
          <PartEditor u={sel.u} />
        ) : (
          <div className="adm-empty">Choose a part or section from the outline.</div>
        )}
      </section>

      {scr && <ScriptureDialog target={scr} onClose={() => setScr(null)} />}
      {moving && <MoveDialog target={moving} onClose={() => setMoving(null)} onMove={(t) => doMove(moving.kind, moving.u, t, 'into')} />}
    </div>
  )
}

