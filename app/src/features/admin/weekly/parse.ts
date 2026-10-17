// Splits a pasted week (from the PDF or WhatsApp) into its parts, exactly as the old
// Admin Console did (design/src/admin/app.js: parseWeekly): the date/title line, numbered
// prayers (lines wrap onto the prayer above), and the "we pray, Amen" closing.

export type ParsedWeek = { week_of: string | null; title: string; intro: string; prayers: { text: string; ref: string }[]; closing: string }

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function parseWeekly(raw: string): ParsedWeek {
  const t = (raw || '').replace(/\r/g, '').replace(/ /g, ' ').replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '')
  const head: string[] = [], items: { text: string }[] = []
  let closing = '', cur: { text: string } | null = null
  t.split('\n')
    .map((l) => l.trim())
    .forEach((l) => {
      if (!l) return
      const m = /^(\d{1,2})\s*[.)]\s+(.*)$/.exec(l)
      if (m) {
        cur = { text: m[2] }
        items.push(cur)
        return
      }
      if (/we pray,?\s*amen|^amen[.!]*$/i.test(l)) {
        closing = (closing ? closing + ' ' : '') + l
        cur = null
        return
      }
      if (cur) cur.text += ' ' + l
      else if (!items.length) head.push(l)
      else closing = (closing ? closing + ' ' : '') + l
    })

  let week_of: string | null = null, title = '', intro = ''
  if (head.length) {
    const h = head[0], dm = /([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/.exec(h)
    if (dm) {
      const d = new Date(`${dm[1]} ${dm[2]}, ${dm[3]}`)
      if (!isNaN(d.getTime())) week_of = dayKey(d)
    }
    title = dm ? h.replace(dm[0], '').replace(/^[\s,–—-]+|[\s,–—-]+$/g, '') : h
    intro = head.slice(1).join(' ')
  }
  const prayers = items.map((it) => {
    const text = it.text.replace(/\s+/g, ' ').trim()
    const rm = /according to\s+(.+?)[,\s]+(?:which|that)\s+say/i.exec(text)
    return { text, ref: rm ? rm[1].replace(/[\s,–—-]+$/, '').trim() : '' }
  })
  return { week_of, title, intro, prayers, closing }
}
