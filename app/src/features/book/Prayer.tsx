import { BookOpen, Check, Speaker, Star } from '../../components/icons.tsx'
import type { PrayerView } from './model.ts'
import type { Scripture as ScriptureT } from './types.ts'

type Props = {
  p: PrayerView
  reading: boolean
  onToggle: () => void
  onFav: () => void
  onVerse: (sc: ScriptureT) => void
  onFocus: () => void
  onListen?: () => void
}

// Selecting text shouldn't open Focused Mode.
const selecting = () => String(window.getSelection?.() ?? '').length > 0

// One numbered prayer (<li data-prayer> in the design). Not yet ported: share.
export default function Prayer({ p, reading, onToggle, onFav, onVerse, onFocus, onListen }: Props) {
  return (
    <li id={p.id} className={reading ? 'prayer reading' : 'prayer'}>
      <div className="prayer-gutter">
        <span className="prayer-n">{p.n}</span>
        <button
          className="prayer-check"
          onClick={onToggle}
          aria-pressed={p.checked}
          aria-label={p.checked ? 'Prayed — tap to undo' : 'Mark as prayed'}
          title={p.checked ? 'Prayed — tap to undo' : 'Mark as prayed'}
        >
          <span className={p.checked ? 'ck on' : 'ck'}>
            <Check />
          </span>
        </button>
      </div>
      <div className="prayer-body">
        <p className="prayer-text" onClick={() => !selecting() && onFocus()} title="Open in Focused Mode">
          {p.text}
        </p>
        {p.showScripture &&
          p.scripture.map((sc, i) => (
            <div key={i} className="prayer-scripture">
              <button className="ref-link" onClick={() => onVerse(sc)} title="Read this passage">
                {sc.ref}
              </button>
              <span className="verse-text">
                {sc.verses.map((v, k) => (
                  <span key={k}>
                    {' '}
                    {v.n && <sup>{v.n}</sup>}
                    {v.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        {p.refChips.length > 0 && (
          <div className="ref-chips">
            {p.refChips.map((sc, i) => (
              <button key={i} className="ref-chip" onClick={() => onVerse(sc)} aria-label={`Read ${sc.ref}`}>
                <BookOpen />
                {sc.ref}
              </button>
            ))}
          </div>
        )}
        <div className="prayer-actions">
          <button
            className={p.fav ? 'icon-btn fav on' : 'icon-btn fav'}
            onClick={onFav}
            aria-label={p.fav ? 'Remove from favorites' : 'Add to favorites'}
            title={p.fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star on={p.fav} />
          </button>
          {onListen && (
            <button className={reading ? 'icon-btn listen on' : 'icon-btn listen'} onClick={onListen} aria-label="Read aloud from here" title="Read aloud from here">
              <Speaker size={19} short />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
