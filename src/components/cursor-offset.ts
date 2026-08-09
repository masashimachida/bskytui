import { cursorRowCol } from './text-lines.js'

// Inkの<Text>コンポーネントによる自動折返しを考慮してカーソル位置を計算する。
// 実体はtext-lines.tsのcursorRowColの薄いラッパー(x=col, y=row)。
export function cursorOffset(value: string, cursor: number, maxWidth: number): { x: number; y: number } {
  const { row, col } = cursorRowCol(value, cursor, maxWidth)
  return { x: col, y: row }
}
