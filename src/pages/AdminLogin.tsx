import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('quizbattle_admin', 'true')
      navigate('/admin/dashboard')
    } else {
      setError('Incorrect password')
    }
  }

  if (sessionStorage.getItem('quizbattle_admin') === 'true') {
    navigate('/admin/dashboard', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black mb-1">Admin Login</h1>
          <p className="text-white/50 text-sm">Enter the admin password to continue</p>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-brand-accent font-bold text-lg hover:bg-purple-600 transition"
          >
            Sign In
          </button>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-white/40 text-sm hover:text-white/60 transition"
        >
          &larr; Back to home
        </button>
      </div>
    </div>
  )
}
