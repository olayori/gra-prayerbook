// The catalog's book settings (books.config), as the console reads them.
export type BookConfigJson = {
  reader: 'prayer' | 'reading'
  levels: { name: string; show_titles: boolean }[]
  content: string[]
  check_on: string
  numbering: 'nested' | 'running' | 'none'
  actions_on: string
  schedule: 'fixed' | 'dated'
  features: Record<string, boolean>
}
