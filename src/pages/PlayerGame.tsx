import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Game, Question, Player, OptionKey } from '../types'
import ShapeButton from '../components/ShapeButton'
import FocusedScoreboard from '../components/FocusedScoreboard'
import Timer from '../components/Timer'

interface PlayerSession {
  playerId: string
  nickname: string
}

export default function PlayerGame() {
  const { joinCode } = useParams<{ joinCode: string }>()
  const navigate = useNavigate()

  const [game, setGame] = useState<Game | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [session, setSession] = useState<PlayerSession | null>(null)

  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null)
  const [answerResult, setAnswerResult] = useState<{ is_correct: boolean; score: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Load game and session
  useEffect(() => {
    if (!joinCode) return
    const load = async () => {
      const { data: g } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .single()

      if (!g) {
        navigate('/', { replace: true })
        return
      }

      setGame(g)

      const stored = localStorage.getItem(`quizbattle_player_${g.id}`)
      if (!stored) {
        navigate(`/play/${joinCode}`, { replace: true })
        return
      }

      const parsed: PlayerSession = JSON.parse(stored)
      setSession(parsed)

      const [qRes, pRes] = await Promise.all([
        supabase.from('questions').select('*').eq('game_id', g.id).order('order_index'),
        supabase.from('players').select('*').eq('game_id', g.id).order('total_score', { ascending: false }),
      ])
      if (qRes.data) setQuestions(qRes.data)
      if (pRes.data) setPlayers(pRes.data)
    }
    load()
  }, [joinCode, navigate])

  // Realtime: game state
  useEffect(() => {
    if (!game) return
    const channel = supabase
      .channel(`player-game-${game.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${game.id}`,
      }, (payload) => {
        const updated = payload.new as Game
        setGame(updated)
        // Reset answer state when new question starts
        if (updated.phase === 'question') {
          setSelectedOption(null)
          setAnswerResult(null)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [game?.id])

  // Refresh players only when scoreboard is revealed (or game finished)
  useEffect(() => {
    if (!game || (game.phase !== 'scores' && game.phase !== 'finished')) return
    if (game.phase === 'scores' && game.scores_revealed !== true) return
    const refresh = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .order('total_score', { ascending: false })
      if (data) setPlayers(data)
    }
    refresh()
  }, [game?.phase, game?.id, game?.scores_revealed])

  const submitAnswer = useCallback(async (option: OptionKey) => {
    if (!game || !session || !questions.length || submitting || selectedOption) return

    const currentQ = questions[game.current_question_index]
    if (!currentQ) return

    setSelectedOption(option)
    setSubmitting(true)

    try {
      const { data, error } = await supabase.rpc('submit_answer', {
        p_player_id: session.playerId,
        p_question_id: currentQ.id,
        p_game_id: game.id,
        p_selected_option: option,
      })

      if (error) throw error

      if (data && typeof data === 'object' && !('error' in data)) {
        setAnswerResult(data as { is_correct: boolean; score: number })
      }
    } catch (err) {
      console.error('Failed to submit answer:', err)
    } finally {
      setSubmitting(false)
    }
  }, [game, session, questions, submitting, selectedOption])

  if (!game || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl font-bold text-white/50">Loading...</div>
      </div>
    )
  }

  // --- LOBBY ---
  if (game.phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-3xl font-black text-center">You're in!</h1>
        <p className="text-white/60 text-lg text-center">
          Welcome, <span className="text-white font-bold">{session.nickname}</span>
        </p>
        <div className="bg-white/10 rounded-2xl px-8 py-4 mt-4">
          <p className="text-white/50 text-center animate-pulse">
            Waiting for the host to start...
          </p>
        </div>
      </div>
    )
  }

  // --- QUESTION ---
  if (game.phase === 'question') {
    const hasAnswered = selectedOption !== null

    return (
      <div className="min-h-screen flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          <p className="text-white/60 text-sm font-medium">
            Q{game.current_question_index + 1}/{questions.length}
          </p>
          {game.question_started_at && (
            <Timer startTime={game.question_started_at} duration={20} size="sm" />
          )}
        </div>

        {hasAnswered ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-5xl">
              {answerResult ? (answerResult.is_correct ? '✅' : '❌') : '⏳'}
            </div>
            <h2 className="text-2xl font-bold text-center">
              {answerResult
                ? answerResult.is_correct
                  ? `Correct! +${answerResult.score.toFixed(1)} pts`
                  : 'Wrong answer!'
                : 'Answer submitted!'}
            </h2>
            <p className="text-white/50">Waiting for results...</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-3">
            {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => (
              <ShapeButton
                key={key}
                option={key}
                onClick={() => submitAnswer(key)}
                disabled={submitting}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // --- SCORES ---
  if (game.phase === 'scores') {
    const revealed = game.scores_revealed === true
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        {answerResult && (
          <div className="text-center mb-2">
            <p className={`text-lg font-bold ${answerResult.is_correct ? 'text-green-400' : 'text-red-400'}`}>
              {answerResult.is_correct
                ? `+${answerResult.score.toFixed(1)} points!`
                : 'No points this round'}
            </p>
          </div>
        )}
        {!revealed ? (
          <div className="text-center space-y-2">
            <p className="text-white/60 font-semibold">Answers are in…</p>
            <p className="text-white/40 text-sm animate-pulse">
              Waiting for the host to reveal the scoreboard...
            </p>
          </div>
        ) : (
          <>
            <FocusedScoreboard
              players={players}
              myPlayerId={session.playerId}
            />
            <p className="text-white/40 text-sm animate-pulse">
              Waiting for next question...
            </p>
          </>
        )}
      </div>
    )
  }

  // --- FINISHED ---
  if (game.phase === 'finished') {
    const myPlayer = players.find((p) => p.id === session.playerId)
    const rank = players.findIndex((p) => p.id === session.playerId) + 1

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        <h1 className="text-4xl font-black text-shadow-lg bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          Game Over!
        </h1>
        {myPlayer && (
          <div className="bg-white/10 rounded-2xl px-8 py-4 text-center">
            <p className="text-white/60 text-sm">Your final score</p>
            <p className="text-4xl font-black">{myPlayer.total_score.toFixed(1)}</p>
            <p className="text-white/60 text-sm">Rank #{rank}</p>
          </div>
        )}
        <FocusedScoreboard
          players={players}
          myPlayerId={session.playerId}
          title="Final Standings"
        />
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-6 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20 transition"
        >
          Back to home
        </button>
      </div>
    )
  }

  // --- SETUP / fallback ---
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-white/50 animate-pulse">Waiting for game to start...</p>
    </div>
  )
}
