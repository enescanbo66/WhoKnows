import { type OptionKey, OPTION_SHAPES, SHAPE_COLORS, SHAPE_LABELS } from '../types'

interface ShapeButtonProps {
  option: OptionKey
  onClick: () => void
  disabled?: boolean
  selected?: boolean
}

function ShapeSVG({ option }: { option: OptionKey }) {
  const shape = OPTION_SHAPES[option]

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-lg">
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
  )
}

export default function ShapeButton({
  option,
  onClick,
  disabled,
  selected,
}: ShapeButtonProps) {
  const shape = OPTION_SHAPES[option]
  const color = SHAPE_COLORS[shape]
  const label = SHAPE_LABELS[shape]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center gap-2
        rounded-2xl font-bold text-white text-lg
        transition-all duration-150 active:scale-95
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'}
        ${selected ? 'ring-4 ring-white ring-offset-2 ring-offset-brand-dark scale-95' : ''}
      `}
      style={{
        backgroundColor: color,
        minHeight: '140px',
      }}
    >
      <ShapeSVG option={option} />
      <span className="text-sm font-semibold tracking-wider uppercase opacity-90">
        {label}
      </span>
    </button>
  )
}
