import { useCallback, useRef, useState } from 'react'

// Short confirmation messages ("Bookmarked"), shown for 2.4s as in the design.
export function useToast() {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = useCallback((t: string) => {
    clearTimeout(timer.current)
    setText(t)
    timer.current = setTimeout(() => setText(null), 2400)
  }, [])
  const node = text ? (
    <div className="toast" role="status">
      {text}
    </div>
  ) : null
  return [node, show] as const
}
