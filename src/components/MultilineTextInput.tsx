import React, { useLayoutEffect, useReducer, useRef, useState } from 'react'
import { Box, Text, measureElement, useCursor, useInput } from 'ink'
import type { DOMElement } from 'ink'
import { cursorOffset } from './cursor-offset.js'
import { cursorRowCol, wrapToLines } from './text-lines.js'
import { textBufferReducer, initialTextBufferState } from './text-buffer.js'

const BORDER_ROWS = 1 // paddingXは横方向のみなので、上枠1行分だけ考慮すればよい
const BORDER_LEFT = 1 // 左枠線(│)の1列分
const BORDER_RIGHT = 1 // 右枠線(│)の1列分
const PADDING_X = 1
const VISIBLE_LINES = 3
const SCROLLOFF = 1

export function MultilineTextInput({
  onSubmit,
  onCancel,
  active,
}: {
  onSubmit: (text: string) => void
  onCancel: () => void
  active: boolean
}) {
  const [state, dispatch] = useReducer(textBufferReducer, initialTextBufferState)
  const { setCursorPosition } = useCursor()
  const boxRef = useRef<DOMElement>(null)
  const [box, setBox] = useState<{ x: number; y: number; width: number } | null>(null)
  const [viewStart, setViewStart] = useState(0)

  // Boxの絶対位置とテキスト折返し計算に必要な幅は、親要素の構成が変わらない限り
  // 一定なので、測定できたらstateにキャッシュする。measureElementはレンダー後
  // (post-render)でないと正確な値を返さないため、useLayoutEffectで測定する。
  useLayoutEffect(() => {
    if (!boxRef.current) return
    const { x, y, width } = measureElement(boxRef.current)
    setBox((prev) => (prev && prev.x === x && prev.y === y && prev.width === width ? prev : { x, y, width }))
  })

  // <Text>はBox幅を超えると自動折返しされるため、テキスト折返し計算にも同じ利用可能幅を渡す
  const availableWidth = box ? Math.max(1, box.width - BORDER_LEFT - BORDER_RIGHT - PADDING_X * 2) : 1
  const lines = wrapToLines(state.value, availableWidth)
  const { row: cursorRow } = cursorRowCol(state.value, state.cursor, availableWidth)

  // 表示範囲(viewStart起点でVISIBLE_LINES行)からカーソル行がSCROLLOFF行以内に近づいたら
  // 1行分スクロールする。measureElementは使わず、文字列操作の結果だけで完結する計算
  // なので、レンダー中に直接補正してよい(cursorOffsetの計算と同じレンダー中パターン)。
  let nextViewStart = viewStart
  if (cursorRow - SCROLLOFF < nextViewStart) {
    nextViewStart = Math.max(0, cursorRow - SCROLLOFF)
  } else if (cursorRow + SCROLLOFF > nextViewStart + VISIBLE_LINES - 1) {
    nextViewStart = Math.min(cursorRow + SCROLLOFF - VISIBLE_LINES + 1, Math.max(0, lines.length - VISIBLE_LINES))
  }
  if (nextViewStart !== viewStart) {
    setViewStart(nextViewStart)
  }

  const hasHiddenAbove = nextViewStart > 0
  const hasHiddenBelow = nextViewStart + VISIBLE_LINES < lines.length
  const visibleLines = lines.slice(nextViewStart, nextViewStart + VISIBLE_LINES)
  // テキストが少ない時もBoxの高さが変わらないよう、常にVISIBLE_LINES行になるまで
  // 空行で埋める。上下のインジケーター行も条件付きレンダーではなく常に1行確保し、
  // 表示しない時は半角スペース1文字にする(空文字列だと高さが潰れるInkの罠を回避)。
  const paddedLines = [...visibleLines]
  while (paddedLines.length < VISIBLE_LINES) paddedLines.push('')

  // setCursorPositionはレンダー中に呼ぶ設計(内部でuseInsertionEffectに反映
  // タイミングを委ねている)のため、post-renderのuseLayoutEffect内では呼ばない。
  // boxが確定していれば、その場でカーソルの絶対位置を計算できる。
  if (active && box) {
    const offset = cursorOffset(state.value, state.cursor, availableWidth)
    // 上インジケーター行は常に1行確保されているので、オフセットは常に+1固定
    setCursorPosition({
      x: box.x + offset.x + BORDER_LEFT + PADDING_X,
      y: box.y + (offset.y - nextViewStart) + 1 + BORDER_ROWS,
    })
  } else {
    setCursorPosition(undefined)
  }

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel()
        return
      }
      if (key.return && key.meta) {
        dispatch({ type: 'insert', text: '\n' })
        return
      }
      if (key.return) {
        onSubmit(state.value)
        return
      }
      if (key.backspace || key.delete) {
        dispatch({ type: 'backspace' })
        return
      }
      if (key.upArrow) {
        dispatch({ type: 'move-up', maxWidth: availableWidth })
        return
      }
      if (key.downArrow) {
        dispatch({ type: 'move-down', maxWidth: availableWidth })
        return
      }
      if (key.leftArrow) {
        dispatch({ type: 'move-left' })
        return
      }
      if (key.rightArrow) {
        dispatch({ type: 'move-right' })
        return
      }
      if (input) {
        dispatch({ type: 'insert', text: input })
      }
    },
    { isActive: active },
  )

  return (
    <Box ref={boxRef} borderStyle="round" paddingX={1} flexDirection="column">
      <Text dimColor>{hasHiddenAbove ? '▲' : ' '}</Text>
      <Text>{paddedLines.join('\n')}</Text>
      <Text dimColor>{hasHiddenBelow ? '▼' : ' '}</Text>
      <Text dimColor>{state.value.length}/300文字 Enter:投稿 Alt+Enter:改行 Esc:キャンセル</Text>
    </Box>
  )
}
