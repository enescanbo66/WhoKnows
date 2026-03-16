import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-6xl sm:text-7xl font-black mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
          WhoKnows
        </h1>
        <p className="text-white/60 text-lg">Fast-paced live trivia for everyone</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg text-center">Join a Game</h2>
          <input
            type="text"
            placeholder="Enter game code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-center text-2xl font-bold tracking-[0.2em] placeholder:text-white/30 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <button
            onClick={() => joinCode.length >= 4 && navigate(`/play/${joinCode}`)}
            disabled={joinCode.length < 4}
            className="w-full py-3 rounded-xl bg-brand-accent font-bold text-lg hover:bg-purple-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join
          </button>
        </div>

        <div className="text-center text-white/30">or</div>

        <button
          onClick={() => navigate('/admin')}
          className="w-full py-3 rounded-xl bg-white/10 border border-white/20 font-bold text-lg hover:bg-white/20 transition"
        >
          Host a Game
        </button>
      </div>
    </div>
  )
}
