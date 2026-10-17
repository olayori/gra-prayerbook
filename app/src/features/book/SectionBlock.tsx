import { ttsSupported } from '../../lib/speech.ts'
import { Bookmark, CheckAll, FocusIcon, Speaker } from '../../components/icons.tsx'
import Logo from './Logo.tsx'
import type { SectionView } from './model.ts'
import Prayer from './Prayer.tsx'
import type { BookStore } from './store.ts'
import type { Scripture } from './types.ts'

type Props = {
  s: SectionView
  store: BookStore
  readingPid: string | null
  toast: (t: string) => void
  onVerse: (sc: Scripture) => void
  onFocus: (sid: string, i?: number) => void
  onListen: (sid: string, pid?: string) => void
}

// A section (<article data-sec> in the design): header, scripture foundation,
// prayers or a prayer list, and the closing ornament.
export default function SectionBlock({ s, store, readingPid, toast, onVerse, onFocus, onListen }: Props) {
  const tts = ttsSupported()
  const allDone = s.total > 0 && s.done === s.total
  return (
    <article id={s.id} className={s.compact ? 'section compact' : 'section'}>
      {s.bookmarked && <div className="ribbon" aria-hidden="true" />}
      {s.showHdr && (
        <header className="section-hdr">
          <div className="section-kicker">
            <span>{s.kicker}</span>
            <span className="section-progress">{s.progress}</span>
          </div>
          {(s.showTitle || s.isList) && <h3 className="section-title">{s.title}</h3>}
          {!s.isList && (
            <div className="actions">
              <button className="btn btn-ghost" onClick={() => store.setMany(s.ids, !allDone)}>
                <CheckAll />
                <span>{allDone ? 'Clear section' : 'Mark all prayed'}</span>
              </button>
              <button className="btn btn-ghost" onClick={() => onFocus(s.id)}>
                <FocusIcon />
                <span>Focused Mode</span>
              </button>
              <button className="btn btn-ghost" onClick={() => toast(store.toggleBm(s.id) ? 'Bookmarked' : 'Bookmark removed')}>
                <Bookmark on={s.bookmarked} />
                <span>{s.bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
              {tts && (
                <button className="btn btn-ghost" onClick={() => onListen(s.id)}>
                  <Speaker />
                  <span>Listen</span>
                </button>
              )}
            </div>
          )}
        </header>
      )}

      {s.foundation.length > 0 && (
        <div className="foundation">
          <div className="eyebrow">Scripture Foundation</div>
          <div className="foundation-list">
            {s.foundation.map((sc, i) => (
              <blockquote key={i}>
                <div className="foundation-ref">
                  {sc.ref} <span>KJV</span>
                </div>
                <p>
                  {sc.verses.map((v, k) => (
                    <span key={k}>
                      {v.n && <sup>{v.n}</sup>}
                      {v.text}{' '}
                    </span>
                  ))}
                </p>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {s.isList ? (
        <div className="name-list">
          {s.list.map((li, i) => (
            <div key={i}>
              {li.groupStart && <div className="name-group">{li.group}</div>}
              <div className="name-row">
                <span>{li.name}</span>
                <span className="name-sub">{li.sub}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {s.showItemsLabel && <div className="eyebrow items-label">{s.itemsLabel}</div>}
          <ol className="prayers">
            {s.prayers.map((p, idx) => (
              <Prayer
                key={p.id}
                p={p}
                reading={readingPid === p.id}
                onFocus={() => onFocus(s.id, idx)}
                onListen={tts ? () => onListen(s.id, p.id) : undefined}
                onToggle={() => store.toggle(p.id)}
                onFav={() => toast(store.toggleFav(p.id) ? 'Added to favorites' : 'Removed from favorites')}
                onVerse={onVerse}
              />
            ))}
          </ol>
        </>
      )}

      {s.showOrn && (
        <div className="ornament" aria-hidden="true">
          <span />
          <Logo kind="mark" className="ornament-mark" />
          <span />
        </div>
      )}
    </article>
  )
}
