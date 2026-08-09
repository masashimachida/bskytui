import { cursorRowCol, rowColToCursor, wrapToLines } from './text-lines.js'

export interface TextBufferState {
  value: string
  cursor: number
  preferredColumn: number | null
}

export type TextBufferAction =
  | { type: 'insert'; text: string }
  | { type: 'backspace' }
  | { type: 'move-left' }
  | { type: 'move-right' }
  | { type: 'move-up'; maxWidth: number }
  | { type: 'move-down'; maxWidth: number }

export const initialTextBufferState: TextBufferState = { value: '', cursor: 0, preferredColumn: null }

export function textBufferReducer(state: TextBufferState, action: TextBufferAction): TextBufferState {
  switch (action.type) {
    case 'insert': {
      const value = state.value.slice(0, state.cursor) + action.text + state.value.slice(state.cursor)
      return { value, cursor: state.cursor + action.text.length, preferredColumn: null }
    }
    case 'backspace': {
      if (state.cursor === 0) return { ...state, preferredColumn: null }
      const value = state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor)
      return { value, cursor: state.cursor - 1, preferredColumn: null }
    }
    case 'move-left':
      return { ...state, cursor: Math.max(0, state.cursor - 1), preferredColumn: null }
    case 'move-right':
      return { ...state, cursor: Math.min(state.value.length, state.cursor + 1), preferredColumn: null }
    case 'move-up': {
      const { row, col } = cursorRowCol(state.value, state.cursor, action.maxWidth)
      if (row === 0) return { ...state, preferredColumn: state.preferredColumn ?? col }
      const targetCol = state.preferredColumn ?? col
      const cursor = rowColToCursor(state.value, row - 1, targetCol, action.maxWidth)
      return { ...state, cursor, preferredColumn: targetCol }
    }
    case 'move-down': {
      const { row, col } = cursorRowCol(state.value, state.cursor, action.maxWidth)
      const totalLines = wrapToLines(state.value, action.maxWidth).length
      if (row >= totalLines - 1) return { ...state, preferredColumn: state.preferredColumn ?? col }
      const targetCol = state.preferredColumn ?? col
      const cursor = rowColToCursor(state.value, row + 1, targetCol, action.maxWidth)
      return { ...state, cursor, preferredColumn: targetCol }
    }
    default:
      return state
  }
}
