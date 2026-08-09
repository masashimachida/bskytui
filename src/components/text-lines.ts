import wrapAnsi from 'wrap-ansi'
import stringWidth from 'string-width'

// Inkの<Text>コンポーネント(wrap='wrap'、内部ではwrap-ansiを{trim:false, hard:true}で
// 使用)による自動折返しを考慮して、テキストを画面上の表示行配列に変換する。
export function wrapToLines(value: string, maxWidth: number): string[] {
  const wrapped = maxWidth > 0 ? wrapAnsi(value, maxWidth, { trim: false, hard: true }) : value
  return wrapped.split('\n')
}

// カーソル位置(文字index)を、画面上の表示行番号・列に変換する。
export function cursorRowCol(value: string, cursor: number, maxWidth: number): { row: number; col: number } {
  const before = value.slice(0, cursor)
  const lines = wrapToLines(before, maxWidth)
  return { row: lines.length - 1, col: stringWidth(lines[lines.length - 1]) }
}

// テキストを折返した上で最大maxLines行に切り詰め、超過分があれば末尾に省略記号(既定は'...')を
// 付与する。単純に折返し結果のmaxLines行目に省略記号を連結するだけだと、その行がちょうど
// maxWidthいっぱいまで埋まっていた場合(スペース等の自然な区切りがないCJK文では、途中の折返し
// 行は常にmaxWidthちょうどになる)、省略記号を足した分だけmaxWidthを超えてしまい、再度
// wrapToLinesで折返すとmaxLinesを超過してしまう。そのため、maxLines行目だけは
// (maxWidth - 省略記号の表示幅)に収まるよう、書記素クラスタ単位で先頭から切り詰めてから
// 省略記号を付与する。これにより、戻り値を再度wrapToLines(…, maxWidth)で折返しても
// 常にちょうどmaxLines行に収まることが保証される。
export function truncateToLines(value: string, maxWidth: number, maxLines: number, ellipsis = '...'): string {
  if (maxLines <= 0) return ''
  const wrapped = wrapToLines(value, maxWidth)
  if (wrapped.length <= maxLines) return wrapped.join('\n')

  const kept = wrapped.slice(0, maxLines)
  const lastIndex = kept.length - 1
  const ellipsisWidth = stringWidth(ellipsis)
  const budget = Math.max(0, maxWidth - ellipsisWidth)

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  let trimmed = ''
  let width = 0
  for (const { segment } of segmenter.segment(kept[lastIndex])) {
    const segWidth = stringWidth(segment)
    if (width + segWidth > budget) break
    trimmed += segment
    width += segWidth
  }
  kept[lastIndex] = trimmed + ellipsis
  return kept.join('\n')
}

// cursorRowColの逆変換。表示行番号・列から文字indexを求める。
// 元のvalueにおける論理改行(\n)と、wrap-ansiが追加した折返し改行を区別するため、
// 論理行ごとに独立して折返しを行い、表示行を先頭から数え上げて目的の行を特定する。
// ZWJ絵文字（複数コードポイントで1つの書記素クラスタを構成）に対応するため、
// 文字幅計算時は書記素クラスタ単位でイテレートする。
export function rowColToCursor(value: string, row: number, col: number, maxWidth: number): number {
  const logicalLines = value.split('\n')
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  let displayRow = 0
  let charIndex = 0

  for (let li = 0; li < logicalLines.length; li++) {
    const logicalLine = logicalLines[li]
    const wrapped = wrapToLines(logicalLine, maxWidth)

    for (const lineText of wrapped) {
      if (displayRow === row) {
        let offset = 0
        let width = 0
        for (const { segment: ch } of segmenter.segment(lineText)) {
          const chWidth = stringWidth(ch)
          if (width + chWidth > col) break
          width += chWidth
          offset += ch.length
        }
        return charIndex + offset
      }
      charIndex += lineText.length
      displayRow++
    }

    if (li < logicalLines.length - 1) {
      charIndex += 1 // '\n'
    }
  }

  return value.length
}
