import type { OptionKey } from '../types'
import { OPTION_SHAPES, SHAPE_COLORS, SHAPE_LABELS } from '../types'

interface AnswerDistributionProps {
  counts: Record<OptionKey, number>
  totalAnswers: number
}

export default function AnswerDistribution({
  counts,
  totalAnswers,
}: AnswerDistributionProps) {
  const options: OptionKey[] = ['A', 'B', 'C', 'D']
  const max = Math.max(1, ...options.map((k) => counts[k] || 0))

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h3 className="text-xl font-black text-center mb-4 text-shadow-lg">
        Answer distribution
      </h3>
      <div className="space-y-3">
        {options.map((k) => {
          const shape = OPTION_SHAPES[k]
          const label = SHAPE_LABELS[shape]
          const color = SHAPE_COLORS[shape]
          const count = counts[k] || 0
          const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
          const width = (count / max) * 100

          return (
            <div key={k} className="bg-white/10 rounded-xl p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold">{label}</span>
                </div>
                <div className="text-white/70 text-sm tabular-nums">
                  {count} ({pct.toFixed(0)}%)
                </div>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${width}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

