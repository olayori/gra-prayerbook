export type WeeklyPrayer = { text: string; ref?: string }

export type Week = {
  week_of: string // YYYY-MM-DD, the Monday the week starts
  title: string
  intro: string
  prayers: WeeklyPrayer[]
  closing: string
}

// "12 October 2026" style, matching the design's wkLabel(). Parsed as a calendar
// date so the label never shifts a day in timezones west of UTC.
export function weekLabel(weekOf: string, locale?: string): string {
  const [y, m, d] = weekOf.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

// The default title is already the card's kicker, so the design only shows custom titles.
export function customTitle(title: string): string | null {
  return title && !/^\s*(gra\s+)?weekly kingdom prayers\s*$/i.test(title) ? title : null
}

// Newest first; a selected week that is not (or no longer) published falls back to the current one.
export function pickWeek(weeks: Week[], weekOf?: string): Week | undefined {
  return weeks.find((w) => w.week_of === weekOf) ?? weeks[0]
}
