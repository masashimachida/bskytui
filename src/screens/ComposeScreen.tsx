import React, { useLayoutEffect, useRef, useState } from 'react'
import { Box, Text, measureElement } from 'ink'
import type { DOMElement } from 'ink'
import { MultilineTextInput } from '../components/MultilineTextInput.js'
import { truncateToLines } from '../components/text-lines.js'
import { createPost } from '../api/client.js'
import { useStatusMessage } from '../navigation/useStatusMessage.js'
import type { StatusMessage } from '../navigation/useStatusMessage.js'
import type { AtpClient } from '../api/atp-client.js'
import type { Author } from '../api/types.js'

// Modalの高さはApp.tsx側でquoteTargetの有無に応じて9(引用なし)/15(引用あり)を
// 静的に切り替えている(measureElementによる動的測定は使わない、過去に動的高さ測定で
// 実機バグが出た経緯があるため)。コンテンツが実際に必要とする高さよりModalの高さが
// 大きいと、余った分がスペース埋めレイヤーとして背後のタイムラインの上に無駄に
// 覆いかぶさってしまう(実機で確認された不具合)ため、この2値は下記の内訳と必ず
// 一致させる: 引用なし = タイトル(1)+入力欄最大(8) = 9行。
// 引用あり = タイトル(1)+入力欄最大(8)+引用ボックス(2枠+著者1行+本文最大3行=6) = 15行。
const QUOTE_BORDER_LEFT = 1
const QUOTE_BORDER_RIGHT = 1
const QUOTE_PADDING_X = 1
const MAX_QUOTE_TEXT_LINES = 3

export interface ComposeReplyTarget {
  root: { uri: string; cid: string }
  parent: { uri: string; cid: string }
}

export interface ComposeQuoteTarget {
  uri: string
  cid: string
  author: Author
  text: string
}

export function ComposeScreen({
  client,
  replyTo,
  quoteTarget,
  onDone,
  onCancel,
  onStatusChange,
}: {
  client: AtpClient
  replyTo?: ComposeReplyTarget
  quoteTarget?: ComposeQuoteTarget
  onDone: () => void
  onCancel: () => void
  onStatusChange: (message: StatusMessage | null) => void
}) {
  const [error, setError] = useState<string>()
  const [posting, setPosting] = useState(false)
  const quoteBoxRef = useRef<DOMElement>(null)
  const [quoteBoxWidth, setQuoteBoxWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!quoteBoxRef.current) return
    const { width } = measureElement(quoteBoxRef.current)
    setQuoteBoxWidth((prev) => (prev === width ? prev : width))
  })

  useStatusMessage(onStatusChange, posting ? '投稿中...' : undefined, error)

  const quotePreviewLines = (() => {
    if (!quoteTarget) return []
    const availableWidth = Math.max(1, (quoteBoxWidth ?? 0) - QUOTE_BORDER_LEFT - QUOTE_BORDER_RIGHT - QUOTE_PADDING_X * 2)
    return truncateToLines(quoteTarget.text, availableWidth, MAX_QUOTE_TEXT_LINES).split('\n')
  })()

  async function handleSubmit(text: string) {
    const trimmed = text.trim()
    if (!trimmed) {
      setError('本文が空です')
      return
    }
    setPosting(true)
    setError(undefined)
    try {
      await createPost(client, trimmed, replyTo, quoteTarget ? { uri: quoteTarget.uri, cid: quoteTarget.cid } : undefined)
      onDone()
    } catch {
      setError('投稿に失敗しました — 入力内容は保持されています')
      setPosting(false)
    }
  }

  return (
    <Box flexDirection="column">
      <Text bold>{replyTo ? '返信を作成' : quoteTarget ? '引用リポストを作成' : '新規投稿'}</Text>
      {quoteTarget && (
        <Box ref={quoteBoxRef} borderStyle="round" borderColor="#666666" paddingX={1} flexDirection="column">
          <Box>
            <Text bold>{quoteTarget.author.displayName ?? quoteTarget.author.handle}</Text>
            <Text color="#666666"> @{quoteTarget.author.handle}</Text>
          </Box>
          <Text>{quotePreviewLines.join('\n')}</Text>
        </Box>
      )}
      <MultilineTextInput active={!posting} onSubmit={handleSubmit} onCancel={onCancel} />
    </Box>
  )
}
