import { describe, expect, it } from 'vitest'
import { wrapToLines, cursorRowCol, rowColToCursor, truncateToLines } from './text-lines.js'

describe('wrapToLines', () => {
  it('折返し不要な短い文字列は1要素の配列になる', () => {
    expect(wrapToLines('abc', 56)).toEqual(['abc'])
  })

  it('論理改行(\\n)で分割される', () => {
    expect(wrapToLines('abc\ndef', 56)).toEqual(['abc', 'def'])
  })

  it('maxWidthを超える文字列は自動折返しされる', () => {
    const value = '0'.repeat(74)
    expect(wrapToLines(value, 56)).toEqual(['0'.repeat(56), '0'.repeat(18)])
  })
})

describe('cursorRowCol', () => {
  it('折返し不要な短いテキストの末尾はそのまま1行目', () => {
    expect(cursorRowCol('abc', 3, 56)).toEqual({ row: 0, col: 3 })
  })

  it('カーソルが先頭(0)なら{row:0, col:0}', () => {
    expect(cursorRowCol('abc', 0, 56)).toEqual({ row: 0, col: 0 })
  })

  it('論理改行(\\n)の後ろにカーソルがあれば2行目として計算する', () => {
    expect(cursorRowCol('abc\ndef', 7, 56)).toEqual({ row: 1, col: 3 })
  })

  it('maxWidthを超える長さのテキストは自動折返しされた行数をrowに反映する', () => {
    const value = '0'.repeat(74)
    expect(cursorRowCol(value, 74, 56)).toEqual({ row: 1, col: 18 })
  })
})

describe('rowColToCursor', () => {
  it('先頭行の途中位置を文字indexに変換する', () => {
    expect(rowColToCursor('abcdef', 0, 3, 56)).toBe(3)
  })

  it('論理改行をまたいだ行の位置を文字indexに変換する', () => {
    expect(rowColToCursor('abc\ndef', 1, 2, 56)).toBe(6)
  })

  it('目標列が行の文字数を超える場合は行末にクランプする', () => {
    expect(rowColToCursor('ab\ncdef', 0, 10, 56)).toBe(2)
  })

  it('自動折返しされた行をまたいだ位置を文字indexに変換する', () => {
    const value = '0'.repeat(74)
    expect(rowColToCursor(value, 1, 5, 56)).toBe(61)
  })

  it('cursorRowColとの往復変換で元のcursor位置に戻る', () => {
    const value = '0'.repeat(74) + '\nXYZ'
    const cursor = value.length
    const { row, col } = cursorRowCol(value, cursor, 56)
    expect(rowColToCursor(value, row, col, 56)).toBe(cursor)
  })

  it('行番号が範囲外なら末尾にクランプする', () => {
    expect(rowColToCursor('abc', 5, 0, 56)).toBe(3)
  })

  it('ZWJ絵文字（複合書記素クラスタ）を含むテキストでcursorRowColとの往復変換が一致する', () => {
    // 家族絵文字は複数のコードポイント(ZWJで結合)から構成される書記素クラスタ
    const value = '👨‍👩‍👧'
    // 有効な境界(0と文字列末尾)でラウンドトリップを確認
    const cursor = value.length
    const { row, col } = cursorRowCol(value, cursor, 56)
    expect(rowColToCursor(value, row, col, 56)).toBe(cursor)

    // 先頭からのラウンドトリップも確認
    const { row: row0, col: col0 } = cursorRowCol(value, 0, 56)
    expect(rowColToCursor(value, row0, col0, 56)).toBe(0)
  })
})

describe('全角文字を含むケース', () => {
  it('wrapToLines: 全角文字は2セル幅として折返される', () => {
    expect(wrapToLines('あいうえおかきくけこ', 6)).toEqual(['あいう', 'えおか', 'きくけ', 'こ'])
  })

  it('cursorRowCol: 論理改行と全角折返しが混在する場合も正しく行・列を計算する', () => {
    expect(cursorRowCol('あいうえお\nかき', 7, 6)).toEqual({ row: 2, col: 2 })
  })

  it('rowColToCursor: 全角文字の境界に対して奇数colを指定すると左側にクランプする', () => {
    expect(rowColToCursor('あいう', 0, 3, 6)).toBe(1)
  })

  it('rowColToCursor: 全角行をまたぐ移動でsticky columnがASCII短行にクランプされる', () => {
    expect(rowColToCursor('あいうえ\nab\nかきくけ', 1, 8, 20)).toBe(7)
  })

  it('rowColToCursor: sticky columnが保持されCJK行では元の列に復帰する', () => {
    expect(rowColToCursor('あいうえ\nab\nかきくけ', 2, 8, 20)).toBe(12)
  })
})

describe('truncateToLines', () => {
  it('maxLines以下に収まるテキストはそのまま返り、省略記号は付かない', () => {
    expect(truncateToLines('abc\ndef', 56, 3)).toBe('abc\ndef')
  })

  it('スペースのある英文でmaxLines行目に空きがあれば、切り詰めずに省略記号がそのまま収まる', () => {
    // 'ab '(trim:falseのため末尾スペース込みで幅3)の後、単語'cdefghij'(幅8)は
    // 残り幅7に収まらず次行へ折返される。maxLines=1に切り詰めると1行目は
    // 'ab '(幅3)のみで、省略記号(幅3)を足しても計6でmaxWidth(10)に十分収まるため、
    // 書記素を1つも切り捨てずに済む。
    const value = 'ab cdefghij'
    expect(wrapToLines(value, 10)).toEqual(['ab ', 'cdefghij'])

    const result = truncateToLines(value, 10, 1)
    expect(result).toBe('ab ...')
    // 再度折返しても行数が増えないこと
    expect(wrapToLines(result, 10)).toHaveLength(1)
  })

  it('区切りのないCJK文でmaxLines目の行がちょうどmaxWidth幅の場合でも、再折返し後にmaxLines行を超過しない(バグ再現ケース)', () => {
    const value = 'あいうえおかきくけこさしすせそ' // 15文字の全角、各2幅
    const maxWidth = 6 // 全角3文字分
    // 前提: 折返し前は5行になり、3行目がちょうどmaxWidth幅で埋まっている
    const wrapped = wrapToLines(value, maxWidth)
    expect(wrapped).toEqual(['あいう', 'えおか', 'きくけ', 'こさし', 'すせそ'])
    expect(wrapped[2].length * 2).toBe(maxWidth) // 全角3文字 = 6幅ちょうど(目視確認用)

    const result = truncateToLines(value, maxWidth, 3)
    const lines = result.split('\n')
    expect(lines).toHaveLength(3)

    // 核心となる不変条件: 結果を再度maxWidthで折返しても、maxLinesを超過しない
    const rewrapped = wrapToLines(result, maxWidth)
    expect(rewrapped).toHaveLength(3)

    // 省略記号が末尾に付与されていること
    expect(lines[2].endsWith('...')).toBe(true)
  })

  it('maxLinesが0以下なら空文字を返す', () => {
    expect(truncateToLines('abc', 56, 0)).toBe('')
  })
})
