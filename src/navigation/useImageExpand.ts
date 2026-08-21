import { useEffect, useRef, useState } from 'react'
import type { ImageExpandMode } from '../config/types.js'

const EXPAND_DELAY_MS = 100

export interface ImageExpandControls {
  // ScrollingViewportのrenderItemはアイテムの絶対indexを渡さず選択中かどうかのbooleanしか
  // 渡さないため、「そのアイテムが選択中か」を受け取る形にしている(alwaysモードでは選択に
  // 関係なく常にtrueを返す必要があるため、itemIndexとの一致比較ではalwaysを正しく表現できない)。
  isExpanded: (selected: boolean) => boolean
  collapseBeforeAction: (fn: () => void) => void
}

// 選択連動の遅延自動展開(selected)は、選択中1件のみ・短時間のマウントに限定することで
// ink-pictureのuseDirectRenderer(直接stdout書き込み)とInkの描画パイプラインの競合を避ける
// 設計(memory: bsky-cli 画像表示の描画破損問題を参照)。alwaysは対症療法なしの常時展開で、
// 同じ競合が起きるリスクをユーザーが把握した上で選ぶモードのため、遷移前の後始末は行わない。
export function useImageExpand(mode: ImageExpandMode, index: number, hasImage: boolean): ImageExpandControls {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingActionRef = useRef<(() => void) | null>(null)

  const isCurrentlyExpanded = mode === 'selected' && expandedIndex !== null && expandedIndex === index

  useEffect(() => {
    if (pendingActionRef.current && !isCurrentlyExpanded) {
      const fn = pendingActionRef.current
      pendingActionRef.current = null
      fn()
    }
  }, [isCurrentlyExpanded])

  useEffect(() => {
    if (mode !== 'selected') {
      setExpandedIndex(null)
      return
    }
    setExpandedIndex(null)
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current)
      expandTimeoutRef.current = null
    }
    if (!hasImage) return
    expandTimeoutRef.current = setTimeout(() => {
      expandTimeoutRef.current = null
      setExpandedIndex(index)
    }, EXPAND_DELAY_MS)
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current)
        expandTimeoutRef.current = null
      }
    }
  }, [mode, index, hasImage])

  return {
    isExpanded(selected) {
      if (mode === 'always') return true
      if (mode === 'never') return false
      return selected && expandedIndex !== null && expandedIndex === index
    },
    collapseBeforeAction(fn) {
      if (isCurrentlyExpanded) {
        pendingActionRef.current = fn
        setExpandedIndex(null)
      } else {
        fn()
      }
    },
  }
}
