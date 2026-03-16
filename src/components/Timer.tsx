import { useState, useEffect, useRef } from 'react'

interface TimerProps {
  startTime: string
  duration?: number
  onTimeUp?: () => void
  size?: 'sm' | 'lg'
}

export default function Timer({
  startTime,
  duration = 20,
  onTimeUp,
  size = 'lg',
}: TimerProps) {
  const [remaining, setRemaining] = useState(duration)
  const onTimeUpRef = useRef(onTimeUp)
  const firedRef = useRef(false)

  onTimeUpRef.current = onTimeUp

  useEffect(() => {
    firedRef.current = false
    const start = new Date(startTime).getTime()

    const tick = () => {
      const elapsed = (Date.now() - start) / 1000
      const left = Math.max(0, duration - elapsed)
      setRemaining(Math.round(left * 10) / 10)

      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        onTimeUpRef.current?.()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    let frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [startTime, duration])

  const pct = remaining / duration
  const circumference = 2 * Math.PI * 45
  const offset = circumference * (1 - pct)
  const isLg = size === 'lg'
  const dim = isLg ? 140 : 80

  const color =
    remaining > 10 ? '#22c55e' : remaining > 5 ? '#eab308' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} viewBox="0 0 100 100" className="-rotate-90">
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke 0.3s' }}
        />
      </svg>
      <span
        className="absolute font-black tabular-nums"
        style={{ fontSize: isLg ? '2rem' : '1.1rem' }}
      >
        {remaining.toFixed(1)}
      </span>
    </div>
  )
}
