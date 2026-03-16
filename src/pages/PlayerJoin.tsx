import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Game } from '../types'

export default function PlayerJoin() {
  const { joinCode } = useParams<{ joinCode: string }>()
  const navigate = useNavigate()

  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [game, setGame] = useState<Game | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!joinCode) return
    const find = async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .single()

      if (data) {
        setGame(data)

        // Check if player already joined (stored in localStorage)
        const stored = localStorage.getItem(`quizbattle_player_${data.id}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Verify player still exists
          const { data: existing } = await supabase
            .from('players')
            .select('id')
            .eq('id', parsed.playerId)
            .single()
          if (existing) {
            navigate(`/play/${joinCode}/game`, { replace: true })
            return
          }
          localStorage.removeItem(`quizbattle_player_${data.id}`)
        }
      } else {
        setError('Game not found. Check the code and try again.')
      }
      setChecking(false)
    }
    find()
  }, [joinCode, navigate])

  const handleJoin = async () => {
    if (!nickname.trim() || !game) return
    setLoading(true)
    setError('')

    try {
      const { data: player, error: err } = await supabase
        .from('players')
        .insert({ game_id: game.id, nickname: nickname.trim(), total_score: 0 })
        .select()
        .single()

      if (err || !player) throw err || new Error('Failed to join')

      localStorage.setItem(
        `quizbattle_player_${game.id}`,
        JSON.stringify({ playerId: player.id, nickname: player.nickname }),
      )

      navigate(`/play/${joinCode}/game`, { replace: true })
    } catch (err) {
      console.error(err)
      setError('Failed to join the game. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl font-bold text-white/50">Finding game...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-1 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            WhoKnows
          </h1>
          {game && (
            <p className="text-white/50 text-sm">
              Game: <span className="font-mono font-bold tracking-wider">{game.join_code}</span>
            </p>
          )}
        </div>

        {game ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={!nickname.trim() || loading}
              className="w-full py-3 rounded-xl bg-brand-accent font-bold text-lg hover:bg-purple-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : "Let's Go!"}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="text-white/50 hover:text-white/80 text-sm transition"
            >
              &larr; Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
