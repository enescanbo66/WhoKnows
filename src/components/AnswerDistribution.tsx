import type { OptionKey } from '../types'
import { OPTION_SHAPES, SHAPE_COLORS, SHAPE_LABELS } from '../types'

interface AnswerDistributionProps {
  counts: Record<OptionKey, number>
  totalAnswers: number
  correctOption: OptionKey
}

export default function AnswerDistribution({
  counts,
  totalAnswers,
  correctOption,
}: AnswerDistributionProps) {
  const options: OptionKey[] = ['A', 'B', 'C', 'D']
  const max = Math.max(1, ...options.map((k) => counts[k] || 0))

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h3 className="text-xl font-black text-center mb-2 text-shadow-lg">
        Answer distribution
      </h3>
      <div className="flex items-end justify-between gap-4 bg-white/5 rounded-2xl px-4 pt-4 pb-2">
        {options.map((k) => {
          const shape = OPTION_SHAPES[k]
          const label = SHAPE_LABELS[shape]
          const color = SHAPE_COLORS[shape]
          const count = counts[k] || 0
          const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
          const height = (count / max) * 100
          const isCorrect = k === correctOption

          return (
            <div key={k} className="flex flex-col items-center flex-1 min-w-0">
              <div className="relative w-full h-40 bg-black/20 rounded-t-xl overflow-hidden flex items-end">
                <div
                  className={`w-full transition-all duration-500 ease-out rounded-t-xl ${
                    isCorrect ? 'ring-2 ring-yellow-300 shadow-[0_0_15px_rgba(250,250,150,0.7)]' : ''
                  }`}
                  style={{ height: `${height || 4}%`, backgroundColor: color }}
                />
                {isCorrect && (
                  <span className="absolute top-1 left-1 right-1 text-center text-yellow-300 font-black text-sm drop-shadow">
                    ✓
                  </span>
                )}
                {count > 0 && (
                  <span className="absolute bottom-1 left-0 right-0 text-xs font-bold text-center drop-shadow">
                    {count}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-white/70 tabular-nums">
                {pct.toFixed(0)}%
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold">
                <span
                  className="w-3.5 h-3.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

