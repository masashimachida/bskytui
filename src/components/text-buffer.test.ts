import { describe, expect, it } from 'vitest'
import { textBufferReducer, initialTextBufferState } from './text-buffer.js'

describe('textBufferReducer', () => {
  it('insertはカーソル位置に文字列を挿入しカーソルを進める', () => {
    const s1 = textBufferReducer(initialTextBufferState, { type: 'insert', text: 'abc' })
    expect(s1).toEqual({ value: 'abc', cursor: 3, preferredColumn: null })
    const s2 = textBufferReducer({ value: 'ac', cursor: 1, preferredColumn: null }, { type: 'insert', text: 'b' })
    expect(s2).toEqual({ value: 'abc', cursor: 2, preferredColumn: null })
  })

  it('backspaceはカーソル直前の1文字を削除する', () => {
    const s = textBufferReducer({ value: 'abc', cursor: 2, preferredColumn: null }, { type: 'backspace' })
    expect(s).toEqual({ value: 'ac', cursor: 1, preferredColumn: null })
  })

  it('カーソル0でbackspaceしても変化しない', () => {
    const s = textBufferReducer({ value: 'abc', cursor: 0, preferredColumn: null }, { type: 'backspace' })
    expect(s).toEqual({ value: 'abc', cursor: 0, preferredColumn: null })
  })

  it('move-left/move-rightは範囲内でカーソルを動かす', () => {
    expect(textBufferReducer({ value: 'abc', cursor: 1, preferredColumn: null }, { type: 'move-left' }).cursor).toBe(0)
    expect(textBufferReducer({ value: 'abc', cursor: 0, preferredColumn: null }, { type: 'move-left' }).cursor).toBe(0)
    expect(textBufferReducer({ value: 'abc', cursor: 2, preferredColumn: null }, { type: 'move-right' }).cursor).toBe(3)
    expect(textBufferReducer({ value: 'abc', cursor: 3, preferredColumn: null }, { type: 'move-right' }).cursor).toBe(3)
  })
})

describe('textBufferReducer move-up/move-down', () => {
  it('move-upは1つ上の表示行の同じ列にカーソルを移動する', () => {
    const state = { value: 'abc\ndef', cursor: 6, preferredColumn: null }
    const result = textBufferReducer(state, { type: 'move-up', maxWidth: 56 })
    expect(result.cursor).toBe(2)
  })

  it('move-downは1つ下の表示行の同じ列にカーソルを移動する', () => {
    const state = { value: 'abc\ndef', cursor: 2, preferredColumn: null }
    const result = textBufferReducer(state, { type: 'move-down', maxWidth: 56 })
    expect(result.cursor).toBe(6)
  })

  it('最上行でのmove-upはカーソルを動かさない', () => {
    const state = { value: 'abc\ndef', cursor: 1, preferredColumn: null }
    const result = textBufferReducer(state, { type: 'move-up', maxWidth: 56 })
    expect(result.cursor).toBe(1)
  })

  it('最下行でのmove-downはカーソルを動かさない', () => {
    const state = { value: 'abc\ndef', cursor: 5, preferredColumn: null }
    const result = textBufferReducer(state, { type: 'move-down', maxWidth: 56 })
    expect(result.cursor).toBe(5)
  })

  it('短い行をまたいで移動する時は行末にクランプし、preferredColumnは保持する', () => {
    const state = { value: 'abcdef\nxy\n123456', cursor: 6, preferredColumn: null }
    const afterDown = textBufferReducer(state, { type: 'move-down', maxWidth: 56 })
    expect(afterDown.cursor).toBe(9)
    expect(afterDown.preferredColumn).toBe(6)
    const afterDown2 = textBufferReducer(afterDown, { type: 'move-down', maxWidth: 56 })
    expect(afterDown2.cursor).toBe(16)
  })

  it('左右移動や文字入力でpreferredColumnがリセットされる', () => {
    const moved = textBufferReducer(
      { value: 'abcdef\nxy\n123456', cursor: 6, preferredColumn: null },
      { type: 'move-down', maxWidth: 56 },
    )
    expect(moved.preferredColumn).toBe(6)
    const afterLeft = textBufferReducer(moved, { type: 'move-left' })
    expect(afterLeft.preferredColumn).toBe(null)
  })

  it('端に到達してもpreferredColumnは保持される(複数回のmove-upが端でのバグを起こさない)', () => {
    // value = 'xy\nabcdef\n123456'
    // row0: 'xy' (width 2)
    // row1: 'abcdef' (width 6)
    // row2: '123456' (width 6)
    const state = { value: 'xy\nabcdef\n123456', cursor: 9, preferredColumn: null }
    // cursor=9 は row1, col6 (abcdefの末尾)
    const afterFirstUp = textBufferReducer(state, { type: 'move-up', maxWidth: 56 })
    expect(afterFirstUp.cursor).toBe(2) // row0末尾にクランプ
    expect(afterFirstUp.preferredColumn).toBe(6) // sticky columnは6

    // 既に最上段でno-op、このときpreferredColumnは保持されるべき
    const afterSecondUp = textBufferReducer(afterFirstUp, { type: 'move-up', maxWidth: 56 })
    expect(afterSecondUp.cursor).toBe(2) // cursor変わらず
    expect(afterSecondUp.preferredColumn).toBe(6) // preferredColumnも保持される(バグ修正ポイント)

    // move-downで元の列6に戻るべき
    const afterDown = textBufferReducer(afterSecondUp, { type: 'move-down', maxWidth: 56 })
    expect(afterDown.cursor).toBe(9) // row1, col6に戻る
    expect(afterDown.preferredColumn).toBe(6) // preferredColumnもそのまま
  })
})
