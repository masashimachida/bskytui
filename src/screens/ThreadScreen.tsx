import React, { useEffect, useRef, useState } from 'react'
import { Box, useInput } from 'ink'
import open from 'open'
import type { AppBskyFeedDefs } from '@atproto/api'
import { PostItem } from '../components/PostItem.js'
import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { ScrollingViewport, OVERHEAD_ROWS } from '../components/ScrollingViewport.js'
import { postWebUrl, toPostSummary } from '../api/format.js'
import { isSafeExternalUrl } from '../api/sanitize.js'
import { toggleLike, toggleRepost } from '../api/client.js'
import { resolveListNavigation } from '../keymap/vim-list-keymap.js'
import { resolveGlobalAction } from '../keymap/global-keymap.js'
import { useConfig } from '../config/ConfigContext.js'
import { useImageExpand } from '../navigation/useImageExpand.js'
import { useTerminalRows } from '../navigation/useTerminalRows.js'
import { useStatusMessage } from '../navigation/useStatusMessage.js'
import type { StatusMessage } from '../navigation/useStatusMessage.js'
import type { ConfirmAction } from './confirm-action.js'
import type { AtpClient } from '../api/atp-client.js'
import type { PostSummary } from '../api/types.js'

interface ThreadNode {
  post?: unknown
  parent?: unknown
  replies?: unknown[]
}

function isThreadViewPost(node: unknown): node is Required<Pick<ThreadNode, 'post'>> & ThreadNode {
  return !!node && typeof node === 'object' && 'post' in (node as object)
}

function collectReplies(nodes: unknown[]): PostSummary[] {
  const result: PostSummary[] = []
  for (const node of nodes.filter(isThreadViewPost)) {
    result.push(toPostSummary(node.post as never))
    result.push(...collectReplies(node.replies ?? []))
  }
  return result
}

function flattenThread(thread: unknown): { posts: PostSummary[]; currentIndex: number } {
  if (!isThreadViewPost(thread)) return { posts: [], currentIndex: 0 }

  const parentChain: PostSummary[] = []
  let node: unknown = thread.parent
  while (isThreadViewPost(node)) {
    parentChain.unshift(toPostSummary(node.post as never))
    node = node.parent
  }

  const current = toPostSummary(thread.post as never)
  const replies = collectReplies(thread.replies ?? [])

  return { posts: [...parentChain, current, ...replies], currentIndex: parentChain.length }
}

export function ThreadScreen({
  client,
  uri,
  active,
  initialPosts,
  initialIndex,
  onStateChange,
  onReply,
  onBack,
  onOpenProfile,
  onQuote,
  onSwitchTimeline,
  onSwitchNotifications,
  onSwitchFeeds,
  onSwitchProfile,
  onStatusChange,
}: {
  client: AtpClient
  uri: string
  active: boolean
  initialPosts: PostSummary[]
  initialIndex: number
  onStateChange: (posts: PostSummary[], index: number) => void
  onReply: (post: PostSummary, root: PostSummary) => void
  onBack: () => void
  onOpenProfile: (actor: string) => void
  onQuote: (post: PostSummary) => void
  onSwitchTimeline: () => void
  onSwitchNotifications: () => void
  onSwitchFeeds: () => void
  onSwitchProfile: () => void
  onStatusChange: (message: StatusMessage | null) => void
}) {
  const config = useConfig()
  const [posts, setPosts] = useState<PostSummary[]>(initialPosts)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [index, setIndex] = useState(initialIndex)
  const [focusUri, setFocusUri] = useState<string | undefined>(() => initialPosts[initialIndex]?.uri)
  const [loading, setLoading] = useState(initialPosts.length === 0)
  const [error, setError] = useState<string>()
  const imageExpand = useImageExpand(config.display.imageExpand, index, (posts[index]?.images.length ?? 0) > 0)

  useEffect(() => {
    if (initialPosts.length > 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    client
      .getPostThread({ uri })
      .then((res) => {
        if (cancelled) return
        const { posts: flat, currentIndex } = flattenThread(res.data.thread as AppBskyFeedDefs.ThreadViewPost)
        setPosts(flat)
        setIndex(currentIndex)
        setFocusUri(flat[currentIndex]?.uri)
        setError(undefined)
      })
      .catch(() => {
        if (!cancelled) setError('接続エラー — rで再試行')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, uri])

  const latestStateRef = useRef({ posts, index })
  latestStateRef.current = { posts, index }
  useEffect(() => {
    return () => {
      onStateChange(latestStateRef.current.posts, latestStateRef.current.index)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useStatusMessage(onStatusChange, loading ? '読み込み中...' : undefined, error)

  useInput(
    (input, key) => {
      if (key.escape || input === config.keymap.back) {
        imageExpand.collapseBeforeAction(onBack)
        return
      }
      if (error && posts.length === 0) {
        if (input === 'r') setError(undefined)
        return
      }

      const nav = resolveListNavigation(input, key, config.keymap)
      if (nav === 'down') {
        setIndex((i) => Math.min(posts.length - 1, i + 1))
        return
      }
      if (nav === 'up') {
        setIndex((i) => Math.max(0, i - 1))
        return
      }
      if (nav === 'top') {
        setIndex(0)
        return
      }
      if (nav === 'bottom') {
        setIndex(posts.length - 1)
        return
      }

      const action = resolveGlobalAction(input, key, config.keymap)
      if (action === 'switch-timeline') {
        imageExpand.collapseBeforeAction(onSwitchTimeline)
        return
      }
      if (action === 'switch-notifications') {
        imageExpand.collapseBeforeAction(onSwitchNotifications)
        return
      }
      if (action === 'switch-feeds') {
        imageExpand.collapseBeforeAction(onSwitchFeeds)
        return
      }
      if (action === 'switch-profile') {
        imageExpand.collapseBeforeAction(onSwitchProfile)
        return
      }

      const current = posts[index]
      if (!current) return
      if (action === 'reply') imageExpand.collapseBeforeAction(() => onReply(current, posts[0] ?? current))
      if (action === 'view-author') onOpenProfile(current.author.did)
      if (action === 'open-link') {
        if (current.linkCard && isSafeExternalUrl(current.linkCard.uri)) open(current.linkCard.uri).catch(() => {})
      }
      if (action === 'open-post') {
        open(postWebUrl(current)).catch(() => {})
      }
      if (action === 'like') {
        toggleLike(client, current).then((patch) => {
          setPosts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
        })
      }
      if (action === 'repost') {
        setConfirmAction({ type: 'repost', post: current })
      }
      if (action === 'quote') {
        imageExpand.collapseBeforeAction(() => onQuote(current))
      }
    },
    { isActive: active && !confirmAction },
  )

  useInput(
    (input, key) => {
      if (input === 'y') {
        const action = confirmAction
        if (!action) return
        setConfirmAction(null)
        if (action.type === 'repost') {
          toggleRepost(client, action.post)
            .then((patch) => {
              setPosts((prev) => prev.map((p) => (p.uri === action.post.uri ? { ...p, ...patch } : p)))
              setError(undefined)
            })
            .catch(() => {
              setError('リポストに失敗しました')
            })
        }
        return
      }
      if (input === 'n' || key.escape) {
        setConfirmAction(null)
      }
    },
    { isActive: active && !!confirmAction },
  )

  const rows = useTerminalRows()

  if (loading) {
    return <Box flexDirection="column" />
  }

  const availableRows = Math.max(1, rows - OVERHEAD_ROWS)

  return (
    <Box flexDirection="column">
      <ScrollingViewport
        items={posts}
        selectedIndex={index}
        availableRows={availableRows}
        isSelectedExpanded={imageExpand.isExpanded(true)}
        getKey={(post) => post.uri}
        renderItem={(post, selected, suppressImages) => (
          <PostItem
            post={post}
            selected={selected}
            expanded={!suppressImages && imageExpand.isExpanded(selected)}
            indent={post.uri !== focusUri}
          />
        )}
      />
      {confirmAction?.type === 'repost' && (
        <ConfirmDialog
          message="この投稿をリポストしますか?"
          confirmLabel={confirmAction.post.viewerRepostUri ? 'y: リポスト解除' : 'y: リポスト'}
        />
      )}
    </Box>
  )
}
