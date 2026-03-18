import { useMemo } from 'react'
import { type Question, type OptionKey, OPTION_SHAPES, SHAPE_COLORS, SHAPE_LABELS } from '../types'

interface QuestionDisplayProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  showAnswer?: boolean
}

function OptionCard({
  optionKey,
  text,
  isCorrect,
  showAnswer,
}: {
  optionKey: OptionKey
  text: string
  isCorrect: boolean
  showAnswer: boolean
}) {
  const shape = OPTION_SHAPES[optionKey]
  const color = SHAPE_COLORS[shape]
  const label = SHAPE_LABELS[shape]

  return (
    <div
      className={`
        rounded-2xl p-5 flex items-center gap-4 transition-all duration-300
        ${showAnswer && !isCorrect ? 'opacity-30 scale-95' : ''}
        ${showAnswer && isCorrect ? 'ring-4 ring-white shadow-lg shadow-green-500/30' : ''}
      `}
      style={{ backgroundColor: color }}
    >
      <svg viewBox="0 0 100 100" className="w-12 h-12 flex-shrink-0">
        {shape === 'square' && (
          <rect x="10" y="10" width="80" height="80" rx="8" fill="white" />
        )}
        {shape === 'triangle' && (
          <polygon points="50,8 95,92 5,92" fill="white" />
        )}
        {shape === 'circle' && (
          <circle cx="50" cy="50" r="42" fill="white" />
        )}
        {shape === 'hexagon' && (
          <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="white" />
        )}
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-black/70">
          {label}
        </p>
        <p className="text-lg font-bold leading-tight truncate text-black">{text}</p>
      </div>
    </div>
  )
}

export default function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  showAnswer = false,
}: QuestionDisplayProps) {
  const options: { key: OptionKey; text: string }[] = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ]

  // Shuffle options so their positions are random each question.
  // useMemo ensures stable order while the same question is shown.
  const shuffledOptions = useMemo(() => {
    const copy = [...options]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }, [question.id])

  return (
    <div className="w-full max-w-4xl mx-auto">
      <p className="text-center text-white/60 font-semibold mb-2">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h1 className="text-3xl sm:text-4xl font-black text-center mb-8 text-shadow-lg leading-tight">
        {question.question_text}
      </h1>
      {question.image_url && (
        <div className="mb-6 flex justify-center">
          <div className="w-full max-w-3xl bg-white/10 rounded-2xl p-3">
            <img
              src={question.image_url}
              alt="Question"
              className="w-full max-h-[320px] object-contain rounded-xl"
              loading="lazy"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {shuffledOptions.map((opt) => (
          <OptionCard
            key={opt.key}
            optionKey={opt.key}
            text={opt.text}
            isCorrect={opt.key === question.correct_option}
            showAnswer={showAnswer}
          />
        ))}
      </div>
    </div>
  )
}
