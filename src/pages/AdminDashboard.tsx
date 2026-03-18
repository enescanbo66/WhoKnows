import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Question, OptionKey, Quiz, QuizQuestion } from '../types'
import { OPTION_SHAPES, SHAPE_LABELS } from '../types'

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

interface QuestionDraft {
  question_text: string
  image_url?: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: OptionKey
}

const emptyDraft: QuestionDraft = {
  question_text: '',
  image_url: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<QuestionDraft[]>([])
  const [draft, setDraft] = useState<QuestionDraft>({ ...emptyDraft })
  const [loading, setLoading] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [quizName, setQuizName] = useState('')
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem('quizbattle_admin') !== 'true') {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  // Load saved quizzes list
  useEffect(() => {
    const loadQuizzes = async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setQuizzes(data as Quiz[])
    }
    loadQuizzes()
  }, [])

  const addQuestion = () => {
    if (!draft.question_text.trim() || !draft.option_a.trim()) return
    if (editIndex !== null) {
      setQuestions((prev) => prev.map((q, i) => (i === editIndex ? { ...draft } : q)))
      setEditIndex(null)
    } else {
      setQuestions((prev) => [...prev, { ...draft }])
    }
    setDraft({ ...emptyDraft })
  }

  const removeQuestion = (i: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i))
    if (editIndex === i) {
      setEditIndex(null)
      setDraft({ ...emptyDraft })
    }
  }

  const moveQuestion = (from: number, to: number) => {
    if (from === to) return
    if (from < 0 || from >= questions.length) return
    if (to < 0 || to >= questions.length) return
    setQuestions((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
    if (editIndex === from) setEditIndex(to)
    else if (editIndex === to) setEditIndex(from)
  }

  const startEdit = (i: number) => {
    setDraft({ ...questions[i] })
    setEditIndex(i)
  }

  const launchGame = async () => {
    if (questions.length === 0) return
    setLoading(true)
    try {
      const joinCode = generateJoinCode()
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({ join_code: joinCode, phase: 'lobby', current_question_index: 0 })
        .select()
        .single()

      if (gameErr || !game) throw gameErr || new Error('Failed to create game')

      const questionRows = questions.map((q, i) => ({
        game_id: game.id,
        question_text: q.question_text,
        image_url: q.image_url?.trim() || null,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        order_index: i,
      }))

      const { error: qErr } = await supabase.from('questions').insert(questionRows)
      if (qErr) throw qErr

      navigate(`/admin/game/${game.id}`)
    } catch (err) {
      console.error(err)
      alert('Failed to create game. Check your Supabase configuration.')
    } finally {
      setLoading(false)
    }
  }

  const resetBuilder = () => {
    setQuestions([])
    setDraft({ ...emptyDraft })
    setEditIndex(null)
  }

  const loadQuiz = async (quiz: Quiz) => {
    setSelectedQuizId(quiz.id)
    setQuizName(quiz.name)
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_index')

      if (error) throw error

      const drafts: QuestionDraft[] =
        (data as QuizQuestion[] | null)?.map((qq) => ({
          question_text: qq.question_text,
          image_url: (qq as any).image_url || '',
          option_a: qq.option_a,
          option_b: qq.option_b,
          option_c: qq.option_c,
          option_d: qq.option_d,
          correct_option: qq.correct_option,
        })) ?? []

      setQuestions(drafts)
      setDraft({ ...emptyDraft })
      setEditIndex(null)
    } catch (err) {
      console.error(err)
      alert('Failed to load quiz.')
    } finally {
      setLoading(false)
    }
  }

  const startNewQuiz = () => {
    setSelectedQuizId(null)
    setQuizName('')
    resetBuilder()
  }

  const saveQuiz = async () => {
    if (!quizName.trim() || questions.length === 0) return
    setSavingQuiz(true)
    try {
      let quizId = selectedQuizId

      if (!quizId) {
        const { data, error } = await supabase
          .from('quizzes')
          .insert({ name: quizName.trim() })
          .select()
          .single()
        if (error || !data) throw error || new Error('Failed to create quiz')
        quizId = data.id as string
        setSelectedQuizId(quizId)
        setQuizzes((prev) => [data as Quiz, ...prev])
      } else {
        const { error } = await supabase
          .from('quizzes')
          .update({ name: quizName.trim() })
          .eq('id', quizId)
        if (error) throw error
        setQuizzes((prev) =>
          prev.map((q) => (q.id === quizId ? { ...q, name: quizName.trim() } : q)),
        )

        const { error: delErr } = await supabase
          .from('quiz_questions')
          .delete()
          .eq('quiz_id', quizId)
        if (delErr) throw delErr
      }

      const rows = questions.map((q, i) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        image_url: q.image_url?.trim() || null,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        order_index: i,
      }))

      const { error: insErr } = await supabase.from('quiz_questions').insert(rows)
      if (insErr) throw insErr

      alert('Quiz saved.')
    } catch (err) {
      console.error(err)
      alert('Failed to save quiz.')
    } finally {
      setSavingQuiz(false)
    }
  }

  const allFilled =
    draft.question_text.trim() &&
    draft.option_a.trim() &&
    draft.option_b.trim() &&
    draft.option_c.trim() &&
    draft.option_d.trim()

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Create a Game</h1>
          <p className="text-white/40 text-sm">
            Build questions once, save as a quiz, and reuse later.
          </p>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem('quizbattle_admin')
            navigate('/')
          }}
          className="text-white/40 hover:text-white/70 text-sm transition"
        >
          Logout
        </button>
      </div>

      {/* Saved quizzes sidebar */}
      {quizzes.length > 0 && (
        <div className="mb-6 bg-white/5 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm uppercase tracking-wide text-white/60">
              Saved quizzes
            </h2>
            <button
              onClick={startNewQuiz}
              className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              New quiz
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quizzes.map((quiz) => (
              <button
                key={quiz.id}
                onClick={() => loadQuiz(quiz)}
                className={`px-3 py-1.5 rounded-xl text-sm whitespace-nowrap border ${
                  selectedQuizId === quiz.id
                    ? 'bg-brand-accent border-transparent'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {quiz.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quiz name + save */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-white/50 mb-1">
            Quiz name
          </label>
          <input
            placeholder="e.g. General Knowledge, JS Basics..."
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm"
          />
        </div>
        <button
          onClick={saveQuiz}
          disabled={!quizName.trim() || questions.length === 0 || savingQuiz}
          className="sm:w-40 px-4 py-2.5 rounded-xl bg-white/10 border border-brand-accent/60 text-sm font-semibold hover:bg-brand-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {savingQuiz ? 'Saving...' : 'Save quiz'}
        </button>
      </div>

      {/* Added questions */}
      {questions.length > 0 && (
        <div className="mb-8 space-y-2">
          <h2 className="font-bold text-lg mb-3">
            Questions ({questions.length})
          </h2>
          {questions.map((q, i) => (
            <div
              key={i}
              className={`bg-white/10 rounded-xl p-4 flex items-center justify-between gap-3 ${
                dragIndex === i ? 'ring-2 ring-brand-accent/70 bg-white/15' : ''
              }`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIndex === null) return
                moveQuestion(dragIndex, i)
                setDragIndex(null)
              }}
              onDragEnd={() => setDragIndex(null)}
            >
              <div className="flex-1 min-w-0">
                <span className="text-white/40 font-mono mr-2">{i + 1}.</span>
                <span className="font-medium truncate">{q.question_text}</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                  Answer: {SHAPE_LABELS[OPTION_SHAPES[q.correct_option]]}
                </span>
                {q.image_url?.trim() && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-white/10 text-white/60">
                    Image
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(i)}
                  className="px-3 py-1 rounded-lg bg-white/10 text-sm hover:bg-white/20 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeQuestion(i)}
                  className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question form */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4 mb-6">
        <h2 className="font-bold text-lg">
          {editIndex !== null ? `Edit Question ${editIndex + 1}` : 'Add a Question'}
        </h2>
        <input
          placeholder="Question text"
          value={draft.question_text}
          onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
        <input
          placeholder="Image URL (optional)"
          value={draft.image_url || ''}
          onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => {
            const field = `option_${key.toLowerCase()}` as keyof QuestionDraft
            const shape = OPTION_SHAPES[key]
            const label = SHAPE_LABELS[shape]
            return (
              <div key={key} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 font-semibold text-xs uppercase tracking-wide">
                  {label}
                </span>
                <input
                  placeholder={`${label} option`}
                  value={draft[field] as string}
                  onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                  className="w-full pl-24 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-white/60 text-sm font-medium">Correct answer:</label>
          <select
            value={draft.correct_option}
            onChange={(e) => setDraft({ ...draft, correct_option: e.target.value as OptionKey })}
            className="px-3 py-2 rounded-lg bg-black/40 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value="A">A — Square</option>
            <option value="B">B — Triangle</option>
            <option value="C">C — Circle</option>
            <option value="D">D — Hexagon</option>
          </select>
        </div>
        <button
          onClick={addQuestion}
          disabled={!allFilled}
          className="w-full py-3 rounded-xl bg-brand-accent font-bold hover:bg-purple-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {editIndex !== null ? 'Save Changes' : 'Add Question'}
        </button>
      </div>

      {/* Launch button */}
      <button
        onClick={launchGame}
        disabled={questions.length === 0 || loading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 font-black text-xl hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : `Launch Game (${questions.length} question${questions.length !== 1 ? 's' : ''})`}
      </button>
    </div>
  )
}
