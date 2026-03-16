export interface Game {
  id: string
  join_code: string
  phase: 'setup' | 'lobby' | 'question' | 'scores' | 'finished'
  current_question_index: number
  question_started_at: string | null
  created_at: string
}

export interface Quiz {
  id: string
  name: string
  created_at: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: 'A' | 'B' | 'C' | 'D'
  order_index: number
}

export interface Question {
  id: string
  game_id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: 'A' | 'B' | 'C' | 'D'
  order_index: number
}

export interface Player {
  id: string
  game_id: string
  nickname: string
  total_score: number
  created_at: string
}

export interface Answer {
  id: string
  player_id: string
  question_id: string
  selected_option: 'A' | 'B' | 'C' | 'D'
  is_correct: boolean
  score: number
  answered_at: string
}

export type OptionKey = 'A' | 'B' | 'C' | 'D'

export type Shape = 'square' | 'triangle' | 'circle' | 'hexagon'

export const OPTION_SHAPES: Record<OptionKey, Shape> = {
  A: 'square',
  B: 'triangle',
  C: 'circle',
  D: 'hexagon',
}

export const SHAPE_COLORS: Record<Shape, string> = {
  square: '#e21b3c',
  triangle: '#1368ce',
  circle: '#d89e00',
  hexagon: '#26890c',
}

export const SHAPE_LABELS: Record<Shape, string> = {
  square: 'Square',
  triangle: 'Triangle',
  circle: 'Circle',
  hexagon: 'Hexagon',
}
