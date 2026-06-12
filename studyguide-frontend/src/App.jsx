import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AppShell from './AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  )
}
