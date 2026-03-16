import { type Player } from '../types'

interface ScoreboardProps {
  players: Player[]
  highlightPlayerId?: string
  title?: string
}

export default function Scoreboard({
  players,
  highlightPlayerId,
  title = 'Scoreboard',
}: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.total_score - a.total_score)
  const maxScore = sorted[0]?.total_score || 1

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-black text-center mb-6 text-shadow-lg">
        {title}
      </h2>
      <div className="space-y-3">
        {sorted.map((player, i) => {
          const barWidth = maxScore > 0 ? (player.total_score / maxScore) * 100 : 0
          const isHighlighted = player.id === highlightPlayerId

          return (
            <div
              key={player.id}
              className={`
                relative overflow-hidden rounded-xl p-4
                ${isHighlighted ? 'ring-2 ring-yellow-400 bg-white/15' : 'bg-white/10'}
              `}
            >
              <div
                className="absolute inset-0 bg-brand-accent/30 transition-all duration-700 ease-out"
                style={{ width: `${barWidth}%` }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-10 text-center">
                    {i < 3 ? medals[i] : `#${i + 1}`}
                  </span>
                  <span className="font-bold text-lg truncate max-w-[200px]">
                    {player.nickname}
                  </span>
                </div>
                <span className="font-black text-xl tabular-nums">
                  {player.total_score.toFixed(1)}
                </span>
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && (
          <p className="text-center text-white/50">No players yet</p>
        )}
      </div>
    </div>
  )
}
