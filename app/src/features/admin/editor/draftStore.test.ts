import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DraftStore } from './draftStore.ts'

const book = [{ u: 'P', title: 'ONE', subtitle: '', sections: [{ u: 'S', title: 'S', foundation: [], prayers: [{ u: 'A', text: 'a', scripture: [] }] }] }]

// A Supabase stand-in that records calls and lets the test decide when a save lands.
function fake() {
  const calls: string[] = []
  let release: (() => void) | null = null
  const q = { select: () => q, eq: () => q, order: async () => ({ data: [], error: null }) }
  const sb = {
    calls,
    land: () => release?.(),
    from: () => q,
    rpc: async (name: string) => {
      calls.push(name)
      if (name === 'get_edition') return { data: { version: 0, data: book }, error: null }
      if (name === 'get_draft') return { data: null, error: null }
      if (name === 'save_draft') {
        await new Promise<void>((r) => (release = r))
        calls.push('save_draft landed')
        return { data: { conflict: false, updated_at: 't' + calls.length }, error: null }
      }
      if (name === 'publish_edition') return { data: 1, error: null }
      return { data: null, error: null }
    },
  }
  return sb
}

describe('DraftStore.publish', () => {
  it('waits for a save already in flight before publishing', async () => {
    const sb = fake()
    const s = new DraftStore(sb as unknown as SupabaseClient, 'jcfp', 'me@x', false)
    await s.load()
    s.edit('Edited', null, (d) => d.map((p) => ({ ...p, title: 'TWO' })))
    const saving = s.flush()
    await Promise.resolve()
    const pub = s.publish('note')
    for (let i = 0; i < 5; i++) await Promise.resolve()
    expect(sb.calls).not.toContain('publish_edition')
    sb.land()
    await saving
    for (let i = 0; i < 20 && !sb.calls.includes('publish_edition'); i++) {
      await new Promise((r) => setTimeout(r, 0))
      sb.land()
    }
    await pub
    const i = sb.calls.indexOf('publish_edition')
    expect(i).toBeGreaterThan(sb.calls.indexOf('save_draft landed'))
  })

  it('checks the server for a conflict even when the draft looks saved', async () => {
    const sb = fake()
    const s = new DraftStore(sb as unknown as SupabaseClient, 'jcfp', 'me@x', false)
    await s.load()
    expect(s.save).toBe('saved')
    const pub = s.publish('note')
    for (let i = 0; i < 20 && !sb.calls.includes('save_draft'); i++) await new Promise((r) => setTimeout(r, 0))
    expect(sb.calls).toContain('save_draft')
    sb.land()
    await pub
  })
})
