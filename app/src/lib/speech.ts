// Read-aloud with the device's speech voices, ported from design/src/book/app.js
// (voiceScore, bestVoice, ttsChunks, speakChunk). Text is spoken in sentence-sized
// chunks because long utterances get cut off on some browsers.
// TODO(i18n): languages are not ported yet; English voices only.

const LANG = /^en/i
const TTS_LANG = 'en-US'

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name || ''
  if (/\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Ralph|Fred|Junior|Kathy|Grandma|Grandpa|Rocko|Shelley|Eddy|Flo|Reed|Sandy)\b/i.test(n)) return -100
  let s = 0
  if (/natural|neural/i.test(n)) s += 60
  if (/premium/i.test(n)) s += 55
  if (/enhanced/i.test(n)) s += 45
  if (/siri/i.test(n)) s += 40
  if (/google/i.test(n)) s += 30
  if (/online/i.test(n)) s += 15
  if (/compact|espeak/i.test(n)) s -= 30
  if (/en[-_](US|GB)/i.test(v.lang)) s += 5
  if (v.localService === false) s += 3
  return s
}

const tier = (v: SpeechSynthesisVoice) => {
  const s = voiceScore(v)
  return s >= 45 ? 'Natural' : s >= 25 ? 'Enhanced' : ''
}

const usable = () =>
  ttsSupported() ? speechSynthesis.getVoices().filter((v) => LANG.test(v.lang) && voiceScore(v) > -100).sort((a, b) => voiceScore(b) - voiceScore(a)) : []

export function voiceOptions(): { id: string; label: string }[] {
  return usable().map((v) => ({ id: v.voiceURI, label: `${v.name} (${v.lang})${tier(v) ? ' · ' + tier(v) : ''}` }))
}

export function bestVoice(id?: string): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null
  if (id) {
    const v = speechSynthesis.getVoices().find((x) => x.voiceURI === id)
    if (v) return v
  }
  return usable()[0] ?? null
}

// Split into sentences, then pack them into chunks of about 220 characters.
export function chunks(t: string): string[] {
  const out: string[] = []
  let cur = ''
  ;(t.match(/[^.!?;:]+[.!?;:]+["’”)]*\s*|[^.!?;:]+$/g) || [t]).forEach((s) => {
    if ((cur + s).length > 220 && cur) {
      out.push(cur)
      cur = s
    } else cur += s
  })
  if (cur.trim()) out.push(cur)
  return out
}

// Speaks one piece of text; a newer speak() or cancel() silences older ones.
export class Speaker {
  private tok = 0

  cancel() {
    this.tok++
    try {
      speechSynthesis.cancel()
    } catch {
      // not supported
    }
  }

  speak(text: string, opts: { rate?: number; voice?: string }, onDone: () => void) {
    if (!ttsSupported()) return
    this.cancel()
    const tok = this.tok, parts = chunks(text), v = bestVoice(opts.voice)
    let k = 0
    const next = () => {
      if (tok !== this.tok) return
      if (k >= parts.length) return onDone()
      const u = new SpeechSynthesisUtterance(parts[k++])
      u.rate = opts.rate || 1
      u.lang = v ? v.lang : TTS_LANG
      if (v) u.voice = v
      u.onend = next
      u.onerror = (e) => {
        if (tok === this.tok && e.error !== 'interrupted' && e.error !== 'canceled') next()
      }
      speechSynthesis.speak(u)
    }
    next()
  }

  isCurrent(tok: number) {
    return tok === this.tok
  }
  get token() {
    return this.tok
  }
}

export const VOICE_HINT = /iPhone|iPad|Macintosh/.test(typeof navigator === 'undefined' ? '' : navigator.userAgent)
  ? 'Voices marked Natural sound the most lifelike. For more, download an Enhanced or Premium English voice in Settings › Accessibility › Spoken Content › Voices, then reopen the book.'
  : 'Voices marked Natural sound the most lifelike. Microsoft Edge offers the widest choice of natural voices.'
