import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Box, measureElement } from 'ink'
import type { DOMElement } from 'ink'

// HeaderBar分(枠無し1行) + HeaderBar直後のメッセージ行(1) + ターミナル行数ぴったりを避ける安全マージン(1)
export const OVERHEAD_ROWS = 3
const SCROLLOFF = 1
const MAX_RENDER_COUNT = 40 // 描画件数の安全上限(見積もりではない)
const SCROLL_SETTLE_MS = 80

export function ScrollingViewport<T>({
  items,
  selectedIndex,
  availableRows,
  isSelectedExpanded,
  getKey,
  renderItem,
}: {
  items: T[]
  selectedIndex: number
  availableRows: number
  isSelectedExpanded: boolean
  getKey: (item: T) => string
  // suppressImages: スクロール直後の短時間はtrueになる。呼び出し元はこの間、画像展開を
  // 一時的に止めること(理由は下記のisScrolling管理コメントを参照)。
  renderItem: (item: T, selected: boolean, suppressImages: boolean) => React.ReactNode
}) {
  // 初期値をselectedIndexに応じて設定する。0固定だと、詳細画面から戻る等で
  // このコンポーネントが再マウントされselectedIndexが既に大きい状態で始まった場合、
  // targetIndex(selectedIndex+SCROLLOFF)がMAX_RENDER_COUNT件のスライス範囲外になり、
  // targetRefが取得できずuseLayoutEffectの追従ロジックが一切発火しない
  // (viewStartが0に固定されたまま、選択中の投稿が画面外に取り残される)。
  const [viewStart, setViewStart] = useState(() => Math.max(0, selectedIndex - SCROLLOFF))
  const targetRef = useRef<DOMElement>(null)

  const clampedViewStart = Math.min(viewStart, Math.max(0, selectedIndex - SCROLLOFF))
  const targetIndex = selectedIndex + SCROLLOFF

  // スクロール(clampedViewStart変化)直後は画像コンポーネントの行位置(row)が変わり、
  // ink-pictureの直接stdout書き込み(useDirectRenderer)が「古い位置を空白で塗りつぶす
  // クリーンアップ」をInkの新しいテキスト描画より後に実行してしまうことがあり、文字が
  // 欠けて見える(WezTerm実機で確認、詳細はmemory参照)。SCROLL_SETTLE_MSの間、呼び出し元に
  // suppressImages=trueを渡していったん画像をアンマウントさせ、位置が安定してから
  // 再マウントさせることでこの競合を避ける(再マウント時にpositionが最新値で再初期化される
  // ため、以前あった「画像が消えたまま戻らない」症状もこちらで併せて解消される)。
  const prevViewStartRef = useRef(clampedViewStart)
  const [isScrolling, setIsScrolling] = useState(false)
  useEffect(() => {
    if (prevViewStartRef.current === clampedViewStart) return
    prevViewStartRef.current = clampedViewStart
    setIsScrolling(true)
    const settleTimer = setTimeout(() => setIsScrolling(false), SCROLL_SETTLE_MS)
    return () => clearTimeout(settleTimer)
  }, [clampedViewStart])

  const effectiveIsSelectedExpanded = isSelectedExpanded && !isScrolling

  useLayoutEffect(() => {
    if (clampedViewStart < viewStart) {
      setViewStart(clampedViewStart)
      return
    }
    if (targetIndex >= items.length) return
    if (!targetRef.current) return
    const m = measureElement(targetRef.current)
    if (m.height === 0 || m.y + m.height > availableRows) {
      setViewStart((v) => v + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, clampedViewStart, availableRows, items.length, effectiveIsSelectedExpanded])

  const visible = items.slice(clampedViewStart, clampedViewStart + MAX_RENDER_COUNT)

  return (
    <Box flexDirection="column" height={availableRows} overflowY="hidden">
      {visible.map((item, offset) => {
        const i = clampedViewStart + offset
        return (
          <Box key={getKey(item)} flexShrink={0} ref={i === targetIndex ? targetRef : undefined}>
            {renderItem(item, i === selectedIndex, isScrolling)}
          </Box>
        )
      })}
    </Box>
  )
}
