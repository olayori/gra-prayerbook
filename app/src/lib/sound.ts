// Timer sounds for Focused Mode (design: unlockAudio, beep). Browsers only allow audio
// after a tap, so unlock() runs from the tap that starts the timer.
type AC = typeof AudioContext
let ac: AudioContext | null = null

export function unlock() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'playback'
  } catch {
    // not supported
  }
  try {
    const A: AC | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext
    if (!A) return
    ac = ac || new A()
    if (ac.state !== 'running') void ac.resume()
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource()
    s.buffer = b
    s.connect(ac.destination)
    s.start(0)
  } catch {
    // no audio
  }
}

// A short tick for the last seconds; a rising three-note chime when time is up.
export function beep(final: boolean) {
  try {
    if (ac) {
      if (ac.state !== 'running') void ac.resume()
      const t0 = ac.currentTime + 0.01, tones = final ? [[660, 0], [880, 0.16], [1175, 0.32]] : [[880, 0]]
      tones.forEach(([f, d]) => {
        const o = ac!.createOscillator(), g = ac!.createGain(), len = final ? 0.9 : 0.18
        o.type = 'sine'
        o.frequency.value = f
        g.gain.setValueAtTime(0.0001, t0 + d)
        g.gain.exponentialRampToValueAtTime(final ? 0.5 : 0.4, t0 + d + 0.015)
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + len)
        o.connect(g).connect(ac!.destination)
        o.start(t0 + d)
        o.stop(t0 + d + len + 0.05)
      })
    }
  } catch {
    // no audio
  }
  try {
    navigator.vibrate?.(final ? [120, 60, 120] : 40)
  } catch {
    // no vibration
  }
}
