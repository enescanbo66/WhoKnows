import type { Player } from '../types'

function buildVisibleRanks(myIndex: number, n: number): (number | '...')[] {
  if (n <= 0) return []

  const last = n - 1
  const set = new Set<number>()

  // Always show #1 and #last
  set.add(0)
  set.add(last)

  if (myIndex <= 0) {
    // If first: show top 3 + last
    set.add(1)
    set.add(2)
  } else if (myIndex >= last) {
    // If last: show first + last 3
    set.add(last - 1)
    set.add(last - 2)
  } else {
    // Otherwise: show my neighbor window
    set.add(myIndex - 1)
    set.add(myIndex)
    set.add(myIndex + 1)
  }

  // Clamp just in case
  const ranks = [...set].filter((x) => x >= 0 && x < n).sort((a, b) => a - b)
  const out: (number | '...')[] = []
  for (let i = 0; i < ranks.length; i++) {
    const curr = ranks[i]
    const prev = ranks[i - 1]
    if (i > 0 && prev !== undefined && curr - prev > 1) out.push('...')
    out.push(curr)
  }
  return out
}

interface FocusedScoreboardProps {
  players: Player[]
  myPlayerId: string
  title?: string
}

export default function FocusedScoreboard({
  players,
  myPlayerId,
  title = 'Scoreboard',
}: FocusedScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.total_score - a.total_score)
  const myIndex = sorted.findIndex((p) => p.id === myPlayerId)
  const visible = buildVisibleRanks(myIndex === -1 ? 0 : myIndex, sorted.length)

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-black text-center mb-6 text-shadow-lg">
        {title}
      </h2>
      <div className="space-y-3">
        {visible.map((v, idx) => {
          if (v === '...') {
            return (
              <div
                key={`ellipsis-${idx}`}
                className="text-center text-white/40 font-black tracking-widest"
              >
                ...
              </div>
            )
          }

          const player = sorted[v]
          if (!player) return null
          const isMe = player.id === myPlayerId

          return (
            <div
              key={player.id}
              className={`relative overflow-hidden rounded-xl p-4 ${
                isMe ? 'ring-2 ring-yellow-400 bg-white/15' : 'bg-white/10'
              }`}
            >
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-10 text-center font-black">
                    #{v + 1}
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

