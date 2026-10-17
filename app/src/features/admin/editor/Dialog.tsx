import { useEffect, type ReactNode } from 'react'

// The console's dialog frame (template.html: dialog-backdrop / dialog).
export default function Dialog({ title, width = 520, onClose, children }: { title: string; width?: number; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="dialog-backdrop adm-dlg-bd" onClick={onClose}>
      <div className="dialog adm-dlg" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="adm-dlg-head">
          <h2 className="dialog-title">{title}</h2>
          <button className="adm-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
