export type Run = 'stopped' | 'running' | 'paused' | 'done'

// Per-prayer countdown (design: sessResetTimer / sessSetDur / sessPlayPause).
export type Timer = { dur: number; left: number; run: Run }
export type TimerAction = { type: 'dur'; sec: number } | { type: 'prayer' } | { type: 'end' } | { type: 'tick' } | { type: 'up' } | { type: 'playPause' } | { type: 'reset' } | { type: 'stop' }
export function timer(t: Timer, a: TimerAction): Timer {
  switch (a.type) {
    case 'dur': {
      const dur = Math.max(0, Math.min(3600, Math.round(a.sec)))
      return { dur, left: dur, run: 'stopped' }
    }
    case 'prayer': // a new prayer: fresh time, keep running (or resume after "time's up")
      return t.dur ? { ...t, left: t.dur, run: t.run === 'done' ? 'running' : t.run } : { ...t, left: 0, run: 'stopped' }
    case 'end':
      return { ...t, left: 0, run: 'stopped' }
    case 'tick':
      return { ...t, left: t.left - 1 }
    case 'up':
      return { ...t, left: 0, run: 'done' }
    case 'playPause':
      if (!t.dur) return t
      if (t.run === 'running') return { ...t, run: 'paused' }
      if (t.run === 'paused') return { ...t, run: 'running' }
      return { ...t, left: t.dur, run: 'running' }
    case 'reset':
      return { ...t, left: t.dur, run: t.run === 'done' ? 'stopped' : t.run }
    case 'stop':
      return { ...t, left: t.dur, run: 'stopped' }
  }
}
