import { HashRouter, Navigate, Route, Routes } from 'react-router'
import WeeklyPrayers from './features/weekly/WeeklyPrayers.tsx'

// Screens are ported from the Claude Design pages (design/src/) one at a time.
// Until a screen exists here, the live site keeps serving it.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/weekly" element={<WeeklyPrayers />} />
        <Route path="/weekly/:weekOf" element={<WeeklyPrayers />} />
        <Route path="*" element={<Navigate to="/weekly" replace />} />
      </Routes>
    </HashRouter>
  )
}
