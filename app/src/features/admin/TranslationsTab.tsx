import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.ts'
import { useAdmin } from './context.ts'

// Translations tab: correct the DeepL French and Spanish (design/src/admin: trLoad,
// trSave, trVals). The old "Prepare in French and Spanish" button isn't carried over.
type Lang = 'fr' | 'es'
type Row = { src_hash: string; lang: Lang; src: string; out: string; edited: boolean; updated_at: string }
const LANGS: [Lang, string][] = [['fr', 'Français'], ['es', 'Español']]

export default function TranslationsTab() {
  const { me, toast } = useAdmin()
  const [lang, setLang] = useState<Lang>('fr')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Record<string, string>>({})

  // Sets state only after its await, so it can run from the mount effect.
  const load = useCallback(
    async (lg: Lang, query: string) => {
      let r = supabase.from('translations').select('src_hash,lang,src,out,edited,updated_at').eq('lang', lg).order('updated_at', { ascending: false }).limit(60)
      const t = query.trim()
      if (t) {
        const p = '%' + t.replace(/[%_,()]/g, ' ') + '%'
        r = r.or(`src.ilike.${p},out.ilike.${p}`)
      }
      const { data, error } = await r
      setLoading(false)
      setEdit({})
      if (error) {
        setRows([])
        toast('Couldn’t load translations.')
        return
      }
      setRows((data ?? []) as Row[])
    },
    [toast],
  )
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void load('fr', '')
  }, [load])
  const search = (lg = lang) => {
    setLoading(true)
    void load(lg, q)
  }

  const save = async (r: Row, out: string) => {
    const { error } = await supabase.from('translations').update({ out, edited: true, edited_by_email: me || null }).eq('src_hash', r.src_hash).eq('lang', r.lang)
    if (error) return toast('Couldn’t save. ' + (error.message || ''))
    setEdit((e) => {
      const x = { ...e }
      delete x[r.src_hash]
      return x
    })
    setRows((rs) => (rs ?? []).map((x) => (x.src_hash === r.src_hash ? { ...x, out, edited: true } : x)))
    toast('Translation saved')
  }
  const revert = (h: string) =>
    setEdit((e) => {
      const x = { ...e }
      delete x[h]
      return x
    })

  const name = lang === 'fr' ? 'Français' : 'Español'
  return (
    <div className="adm-tr">
      <div className="adm-users-head">
        <div className="adm-col" style={{ gap: 2, flex: 1, minWidth: 220 }}>
          <h1 className="adm-h1 small">Translations</h1>
          <span className="adm-small">French and Spanish are made automatically by DeepL the first time a text is shown. Correct any line here; readers see the change next time they open the app.</span>
        </div>
        <div className="seg-grid adm-modes" style={{ gridTemplateColumns: 'repeat(2, auto)' }}>
          {LANGS.map(([k, label]) => (
            <button
              key={k}
              className={lang === k ? 'seg-opt-btn on' : 'seg-opt-btn'}
              aria-pressed={lang === k}
              onClick={() => {
                setLang(k)
                setRows(null)
                search(k)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="adm-row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input adm-tr-q"
          type="search"
          placeholder="Search English or translated text"
          aria-label="Search translations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button className="btn btn-secondary adm-users-btn" onClick={() => search()}>
          Search
        </button>
      </div>
      {loading && !rows && <p className="adm-p">Loading…</p>}
      {rows && !rows.length && !loading && <p className="adm-p">{q.trim() ? 'No translations match that search.' : 'Nothing translated yet. Open the app in French or Spanish.'}</p>}
      <div className="adm-col" style={{ borderTop: '1px solid var(--color-divider)' }}>
        {(rows ?? []).map((r) => {
          const v = edit[r.src_hash] ?? r.out
          const dirty = edit[r.src_hash] != null && edit[r.src_hash] !== r.out
          return (
            <div key={r.src_hash} className="adm-tr-row">
              <div className="adm-col" style={{ gap: 6 }}>
                <span className="adm-eyebrow">English</span>
                <span className="adm-tr-src">{r.src}</span>
              </div>
              <div className="adm-col" style={{ gap: 6 }}>
                <span className="adm-eyebrow" style={{ color: r.edited ? 'var(--color-accent-700)' : undefined }}>{`${name}${r.edited ? ' · edited' : ' · DeepL'}`}</span>
                <textarea
                  className="input adm-tr-out"
                  value={v}
                  aria-label={`${name} for: ${r.src.slice(0, 60)}`}
                  rows={Math.min(8, Math.max(2, Math.ceil(v.length / 60)))}
                  onChange={(e) => setEdit((x) => ({ ...x, [r.src_hash]: e.target.value }))}
                />
                {dirty && (
                  <div className="adm-row" style={{ gap: 8 }}>
                    <button className="btn btn-primary adm-users-btn" onClick={() => void save(r, v)}>
                      Save
                    </button>
                    <button className="btn btn-secondary adm-users-btn" onClick={() => revert(r.src_hash)}>
                      Undo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
