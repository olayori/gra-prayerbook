import { Bookmark, CheckAll } from '../../components/icons.tsx'
import Logo from './Logo.tsx'
import type { Marks } from './marks.ts'
import type { SectionView } from './model.ts'
import Prayer from './Prayer.tsx'
import type { Scripture } from './types.ts'

type Props = { s: SectionView; marks: Marks; toast: (t: string) => void; onVerse: (sc: Scripture) => void }

// A section (<article data-sec> in the design): header, scripture foundation,
// prayers or a prayer list, and the closing ornament.
export default function SectionBlock({ s, marks, toast, onVerse }: Props) {
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
              <button className="btn btn-ghost" onClick={() => marks.setMany(s.ids, !allDone)}>
                <CheckAll />
                <span>{allDone ? 'Clear section' : 'Mark all prayed'}</span>
              </button>
              <button className="btn btn-ghost" onClick={() => toast(marks.toggleBm(s.id) ? 'Bookmarked' : 'Bookmark removed')}>
                <Bookmark on={s.bookmarked} />
                <span>{s.bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
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
            {s.prayers.map((p) => (
              <Prayer
                key={p.id}
                p={p}
                onToggle={() => marks.toggle(p.id)}
                onFav={() => toast(marks.toggleFav(p.id) ? 'Added to favorites' : 'Removed from favorites')}
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
