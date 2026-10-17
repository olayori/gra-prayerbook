// Icons from the design (Lucide-style strokes), used by the reader screens.
type P = { size?: number }
const svg = (size: number, sw: number, children: React.ReactNode, fill = 'none') => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const ChevronLeft = ({ size = 18 }: P) => svg(size, 1.7, <path d="m15 18-6-6 6-6" />)
export const ArrowUp = ({ size = 20 }: P) => svg(size, 1.6, <path d="M12 19V5M5 12l7-7 7 7" />)
export const ArrowRight = ({ size = 16 }: P) => svg(size, 1.7, <path d="M5 12h14M13 6l6 6-6 6" />)
export const Sun = ({ size = 21 }: P) =>
  svg(size, 1.6, <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>)
export const Moon = ({ size = 20 }: P) => svg(size, 1.6, <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />)
export const Gear = ({ size = 21 }: P) =>
  svg(size, 1.6, <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>)
export const CheckAll = ({ size = 16 }: P) => svg(size, 1.75, <><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></>)
export const Check = ({ size = 14 }: P) => svg(size, 2.4, <path d="M20 6 9 17l-5-5" />)
export const Bookmark = ({ size = 16, on = false }: P & { on?: boolean }) =>
  svg(size, 1.75, <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />, on ? 'currentColor' : 'none')
export const Star = ({ size = 19, on = false }: P & { on?: boolean }) =>
  svg(size, 1.5, <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />, on ? 'currentColor' : 'none')
export const BookOpen = ({ size = 14 }: P) =>
  svg(size, 1.7, <><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></>)
export const DoneCircle = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m8 12 3 3 5-6" />
  </svg>
)
export const Ring = ({ dash }: { dash: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <circle cx="9" cy="9" r="7" fill="none" stroke="var(--color-neutral-300)" strokeWidth="2" />
    <circle cx="9" cy="9" r="7" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray={dash} transform="rotate(-90 9 9)" />
  </svg>
)
