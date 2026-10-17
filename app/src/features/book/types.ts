// Shape of the book content files (site/prayers.json, site/jcfp.json) and the
// published versions admins create in the Admin Console.

export type Verse = { n: string; text: string }
export type Scripture = { ref: string; verses: Verse[] }

export type Prayer = {
  text: string
  scripture: Scripture[]
  link?: 'weekly' // JCFP: placeholder for the weekly prayers, rendered as its own section
}

export type ListItem = { name: string; sub?: string; group?: string }

export type Section = {
  title: string
  hideTitle?: boolean
  kind?: 'list'
  list?: ListItem[]
  itemsLabel?: string
  foundation: Scripture[]
  prayers: Prayer[]
}

export type Part = {
  label?: string
  title: string
  subtitle: string
  sections: Section[]
}
