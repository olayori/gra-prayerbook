import fullDark from '../../assets/logo-full-dark.webp'
import fullLight from '../../assets/logo-full-light.webp'
import markDark from '../../assets/mark-dark.webp'
import markLight from '../../assets/mark-light.webp'
import wmDark from '../../assets/watermark-dark.webp'
import wmLight from '../../assets/watermark-light.webp'

// GRA artwork in light and dark versions; CSS shows the one matching the page theme.
const SRC = {
  full: [fullLight, fullDark],
  mark: [markLight, markDark],
  watermark: [wmLight, wmDark],
} as const

export default function Logo({ kind, alt = '', className }: { kind: keyof typeof SRC; alt?: string; className?: string }) {
  const [light, dark] = SRC[kind]
  return (
    <>
      <img data-logo="light" src={light} alt={alt} className={className} />
      <img data-logo="dark" src={dark} alt={alt} className={className} />
    </>
  )
}
