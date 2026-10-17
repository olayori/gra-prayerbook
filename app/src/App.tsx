import { lazy, Suspense } from 'react'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router'
import { SettingsProvider } from './lib/SettingsProvider.tsx'

// Each screen loads on demand, so the start page doesn't pull in every screen and the Supabase client.
const Reader = lazy(() => import('./features/book/Reader.tsx'))
const WeeklyPrayers = lazy(() => import('./features/weekly/WeeklyPrayers.tsx'))

// Screens are ported from the Claude Design pages (design/src/) one at a time.
// Until a screen exists here, the live site keeps serving it.
export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<PreviewIndex />} />
            <Route path="/weekly" element={<WeeklyPrayers />} />
            <Route path="/weekly/:weekOf" element={<WeeklyPrayers />} />
            <Route path="/book/:book" element={<Reader />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </SettingsProvider>
  )
}

// Temporary start page until the Library home is ported.
function PreviewIndex() {
  return (
    <main className="preview">
      <div className="eyebrow accent">Overcomer’s Library · app preview</div>
      <h1>Ported screens</h1>
      <nav>
        <Link to="/book/covenant">Book of Covenant Prayers</Link>
        <Link to="/book/jcfp">Jesus Chosen Fast and Prayer Prayer Manual</Link>
        <Link to="/weekly">GRA Weekly Kingdom Prayers</Link>
      </nav>
      <p className="muted">The Library home, Bible and reader are still served by the live site.</p>
    </main>
  )
}
