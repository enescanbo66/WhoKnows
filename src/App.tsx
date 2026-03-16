import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminGame from './pages/AdminGame'
import PlayerJoin from './pages/PlayerJoin'
import PlayerGame from './pages/PlayerGame'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/game/:gameId" element={<AdminGame />} />
        <Route path="/play/:joinCode" element={<PlayerJoin />} />
        <Route path="/play/:joinCode/game" element={<PlayerGame />} />
      </Routes>
    </BrowserRouter>
  )
}
