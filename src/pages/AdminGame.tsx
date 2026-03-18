import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Game, Question, Player, OptionKey } from '../types'
import QRCodeDisplay from '../components/QRCodeDisplay'
import QuestionDisplay from '../components/QuestionDisplay'
import Scoreboard from '../components/Scoreboard'
import Timer from '../components/Timer'
import AnswerDistribution from '../components/AnswerDistribution'

export default function AdminGame() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()

  const [game, setGame] = useState<Game | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [answerCount, setAnswerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [distribution, setDistribution] = useState<Record<OptionKey, number> | null>(null)

  // Fetch initial data
  useEffect(() => {
    if (!gameId) return
    const load = async () => {
      const [gRes, qRes, pRes] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        supabase.from('questions').select('*').eq('game_id', gameId).order('order_index'),
        supabase.from('players').select('*').eq('game_id', gameId).order('total_score', { ascending: false }),
      ])
      if (gRes.data) setGame(gRes.data)
      if (qRes.data) setQuestions(qRes.data)
      if (pRes.data) setPlayers(pRes.data)
      setLoading(false)
    }
    load()
  }, [gameId])

  // Realtime: game state changes
  useEffect(() => {
    if (!gameId) return
    const channel = supabase
      .channel(`admin-game-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      }, (payload) => {
        setGame(payload.new as Game)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'players',
        filter: `game_id=eq.${gameId}`,
      }, (payload) => {
        setPlayers((prev) => [...prev, payload.new as Player])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  // Realtime: count answers for current question
  useEffect(() => {
    if (!game || game.phase !== 'question' || !questions.length) return

    const currentQ = questions[game.current_question_index]
    if (!currentQ) return

    setAnswerCount(0)

    const channel = supabase
      .channel(`admin-answers-${currentQ.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'answers',
        filter: `question_id=eq.${currentQ.id}`,
      }, () => {
        setAnswerCount((c) => c + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [game?.phase, game?.current_question_index, questions])

  const startQuestion = useCallback(async (index: number) => {
    if (!gameId) return
    await supabase
      .from('games')
      .update({
        phase: 'question',
        current_question_index: index,
        question_started_at: new Date().toISOString(),
      })
      .eq('id', gameId)
  }, [gameId])

  const showScores = useCallback(async () => {
    if (!gameId) return
    await supabase.from('games').update({ phase: 'scores' }).eq('id', gameId)
    // Refresh player scores
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('total_score', { ascending: false })
    if (data) setPlayers(data)
  }, [gameId])

  const loadDistribution = useCallback(async (questionId: string) => {
    const { data, error } = await supabase
      .from('answers')
      .select('selected_option')
      .eq('question_id', questionId)
    if (error) {
      console.error(error)
      setDistribution(null)
      return
    }
    const counts: Record<OptionKey, number> = { A: 0, B: 0, C: 0, D: 0 }
    for (const row of (data as { selected_option: OptionKey }[]) || []) {
      counts[row.selected_option] = (counts[row.selected_option] || 0) + 1
    }
    setDistribution(counts)
  }, [])

  // Reset distribution when a new question starts
  useEffect(() => {
    if (!game) return
    if (game.phase !== 'question') return
    setDistribution(null)
  }, [game?.phase, game?.current_question_index])

  // Load distribution when entering scores phase
  useEffect(() => {
    if (!game) return
    if (game.phase !== 'scores') return
    if (!currentQuestion) return
    loadDistribution(currentQuestion.id)
  }, [game?.phase, currentQuestion?.id, loadDistribution])

  const finishGame = useCallback(async () => {
    if (!gameId) return
    await supabase.from('games').update({ phase: 'finished' }).eq('id', gameId)
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('total_score', { ascending: false })
    if (data) setPlayers(data)
  }, [gameId])

  const handleTimeUp = useCallback(() => {
    showScores()
  }, [showScores])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-2xl font-bold text-white/50">Loading...</div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400 text-xl">Game not found</p>
      </div>
    )
  }

  const currentQuestion = questions[game.current_question_index]
  const isLastQuestion = game.current_question_index >= questions.length - 1
  const joinUrl = `${window.location.origin}/play/${game.join_code}`

  // --- LOBBY ---
  if (game.phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
        <h1 className="text-4xl font-black text-shadow-lg">Waiting for Players...</h1>
        <QRCodeDisplay joinUrl={joinUrl} joinCode={game.join_code} />
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 w-full max-w-md">
          <h2 className="font-bold text-lg mb-3 text-center">
            Players ({players.length})
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p) => (
              <span key={p.id} className="px-3 py-1.5 bg-white/10 rounded-full text-sm font-medium">
                {p.nickname}
              </span>
            ))}
            {players.length === 0 && (
              <p className="text-white/40 text-sm">Waiting for someone to join...</p>
            )}
          </div>
        </div>
        <button
          onClick={() => startQuestion(0)}
          disabled={players.length === 0}
          className="px-12 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 font-black text-2xl hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Start Game!
        </button>
      </div>
    )
  }

  // --- QUESTION ---
  if (game.phase === 'question' && currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        <div className="absolute top-6 right-6">
          <Timer
            startTime={game.question_started_at!}
            duration={20}
            onTimeUp={handleTimeUp}
          />
        </div>
        <div className="absolute top-6 left-6 bg-white/10 px-4 py-2 rounded-xl">
          <span className="text-white/60 text-sm">Answers: </span>
          <span className="font-bold text-lg">{answerCount}/{players.length}</span>
        </div>
        <QuestionDisplay
          question={currentQuestion}
          questionNumber={game.current_question_index + 1}
          totalQuestions={questions.length}
        />
        {players.length > 0 && (
          <button
            onClick={showScores}
            disabled={answerCount < players.length}
            className="mt-4 px-8 py-3 rounded-2xl bg-white/10 font-semibold text-sm hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {answerCount < players.length
              ? 'Wait for remaining answers...'
              : 'End question and show scores now'}
          </button>
        )}
      </div>
    )
  }

  // --- SCORES ---
  if (game.phase === 'scores') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
        {currentQuestion && (
          <div className="text-center mb-2">
            <p className="text-white/50 text-sm mb-1">Correct answer</p>
            <p className="text-2xl font-bold text-green-400">
              {currentQuestion[`option_${currentQuestion.correct_option.toLowerCase()}` as keyof Question] as string}
            </p>
          </div>
        )}
        <Scoreboard players={players} />
        {distribution && (
          <AnswerDistribution
            counts={distribution}
            totalAnswers={Object.values(distribution).reduce((a, b) => a + b, 0)}
          />
        )}
        <button
          onClick={() => {
            if (isLastQuestion) {
              finishGame()
            } else {
              startQuestion(game.current_question_index + 1)
            }
          }}
          className="px-12 py-4 rounded-2xl bg-gradient-to-r from-brand-accent to-purple-600 font-black text-xl hover:brightness-110 transition"
        >
          {isLastQuestion ? 'Show Final Results' : 'Next Question'}
        </button>
      </div>
    )
  }

  // --- FINISHED ---
  if (game.phase === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
        <h1 className="text-5xl font-black text-shadow-lg bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          Game Over!
        </h1>
        <Scoreboard players={players} title="Final Standings" />
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="px-8 py-3 rounded-xl bg-white/10 font-bold hover:bg-white/20 transition"
        >
          Create New Game
        </button>
      </div>
    )
  }

  return null
}
