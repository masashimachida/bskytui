import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, useInput } from 'ink'
import open from 'open'
import { PostItem } from '../components/PostItem.js'
import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { ScrollingViewport, OVERHEAD_ROWS } from '../components/ScrollingViewport.js'
import {
  dedupeTimelineItems,
  deletePost,
  fetchFeed,
  countNewTimelineItems,
  toggleLike,
  toggleRepost,
} from '../api/client.js'
import { postWebUrl } from '../api/format.js'
import { isSafeExternalUrl } from '../api/sanitize.js'
import { resolveListNavigation } from '../keymap/vim-list-keymap.js'
import { resolveGlobalAction } from '../keymap/global-keymap.js'
import { useConfig } from '../config/ConfigContext.js'
import { useImageExpand } from '../navigation/useImageExpand.js'
import { useTerminalRows } from '../navigation/useTerminalRows.js'
import { useStatusMessage } from '../navigation/useStatusMessage.js'
import type { StatusMessage } from '../navigation/useStatusMessage.js'
import type { ConfirmAction } from './confirm-action.js'
import type { AtpClient } from '../api/atp-client.js'
import type { PostSummary, TimelineItem } from '../api/types.js'

const AUTO_REFRESH_INTERVAL_MS = 60000

export function FeedScreen({
  client,
  feedUri,
  active,
  initialItems,
  initialCursor,
  initialIndex,
  onStateChange,
  onOpenThread,
  onReply,
  onCompose,
  onOpenProfile,
  onQuote,
  onSwitchTimeline,
  onSwitchNotifications,
  onSwitchFeeds,
  onSwitchProfile,
  onStatusChange,
}: {
  client: AtpClient
  feedUri: string
  active: boolean
  initialItems: TimelineItem[]
  initialCursor: string | undefined
  initialIndex: number
  onStateChange: (state: { items: TimelineItem[]; cursor: string | undefined; index: number }) => void
  onOpenThread: (uri: string) => void
  onReply: (post: PostSummary) => void
  onCompose: () => void
  onOpenProfile: (actor?: string) => void
  onQuote: (post: PostSummary) => void
  onSwitchTimeline: () => void
  onSwitchNotifications: () => void
  onSwitchFeeds: () => void
  onSwitchProfile: () => void
  onStatusChange: (message: StatusMessage | null) => void
}) {
  const config = useConfig()
  const [items, setItems] = useState<TimelineItem[]>(initialItems)
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [index, setIndex] = useState(initialIndex)
  const [loading, setLoading] = useState(initialItems.length === 0)
  const [loadError, setLoadError] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const isLoadingMoreRef = useRef(false)
  const retryRef = useRef<() => void>(() => {})
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [hasNewItems, setHasNewItems] = useState(false)
  // TimelineScreenと同じ理由でseenUris/seenRootUrisをページをまたいで永続化する。
  const seenUrisRef = useRef<Set<string>>(new Set(initialItems.map((it) => it.post.uri)))
  const seenRootUrisRef = useRef<Set<string>>(
    new Set(initialItems.filter((it) => it.repostedBy === undefined).map((it) => it.rootUri)),
  )

  const latestStateRef = useRef({ items, cursor, index })
  latestStateRef.current = { items, cursor, index }

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current) return
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    try {
      const page = await fetchFeed(client, feedUri, cursor)
      const deduped = dedupeTimelineItems(page.items, seenUrisRef.current, seenRootUrisRef.current)
      setItems((prev) => [...prev, ...deduped])
      setCursor(page.cursor)
      setLoadError(undefined)
    } catch {
      retryRef.current = loadMore
      setLoadError('接続エラー — rで再試行')
    } finally {
      setLoading(false)
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, feedUri, cursor])

  const reloadFeed = useCallback(async () => {
    if (isLoadingMoreRef.current) return
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    try {
      const page = await fetchFeed(client, feedUri, undefined)
      const newSeenUris = new Set<string>()
      const newSeenRootUris = new Set<string>()
      const rebuilt = dedupeTimelineItems(page.items, newSeenUris, newSeenRootUris)
      seenUrisRef.current = newSeenUris
      seenRootUrisRef.current = newSeenRootUris
      const prevTopUri = latestStateRef.current.items[0]?.post.uri
      const restoredIndex = prevTopUri ? rebuilt.findIndex((it) => it.post.uri === prevTopUri) : -1
      setItems(rebuilt)
      setIndex(restoredIndex >= 0 ? restoredIndex : 0)
      setCursor(page.cursor)
      setHasNewItems(false)
      setLoadError(undefined)
    } catch {
      retryRef.current = reloadFeed
      setLoadError('接続エラー — rで再試行')
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [client, feedUri])

  // 60秒タイマー用。実際にitemsは書き換えず、新着があるかだけ確認して
  // hasNewItemsを更新する。失敗時は次回のタイマー発火に任せて黙って諦める。
  const checkForNewItems = useCallback(async () => {
    if (isLoadingMoreRef.current) return
    try {
      const page = await fetchFeed(client, feedUri, undefined)
      const count = countNewTimelineItems(page.items, seenUrisRef.current, seenRootUrisRef.current)
      if (count > 0) setHasNewItems(true)
    } catch {
      // 黙って諦める
    }
  }, [client, feedUri])

  const performDelete = useCallback(
    (post: PostSummary) => {
      deletePost(client, post)
        .then(() => {
          setItems((prev) => {
            const next = prev.filter((it) => it.post.uri !== post.uri)
            setIndex((i) => Math.min(i, Math.max(0, next.length - 1)))
            return next
          })
          setActionError(undefined)
        })
        .catch(() => {
          setActionError('削除に失敗しました')
        })
    },
    [client],
  )

  const imageExpand = useImageExpand(config.display.imageExpand, index, (items[index]?.post.images.length ?? 0) > 0)

  useEffect(() => {
    if (initialItems.length === 0) {
      loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkForNewItemsRef = useRef(checkForNewItems)
  checkForNewItemsRef.current = checkForNewItems

  useEffect(() => {
    const interval = setInterval(() => {
      checkForNewItemsRef.current()
    }, AUTO_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    return () => {
      onStateChange(latestStateRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useStatusMessage(
    onStatusChange,
    loading || isLoadingMore ? '読み込み中...' : hasNewItems ? '新着あり — ↑で更新' : undefined,
    loadError ?? actionError,
    hasNewItems,
  )

  useInput(
    (input, key) => {
      if (loadError) {
        if (input === 'r') retryRef.current()
        return
      }

      const nav = resolveListNavigation(input, key, config.keymap)
      if (nav === 'down') {
        setIndex((i) => {
          const next = Math.min(items.length - 1, i + 1)
          if (next >= items.length - 3 && cursor) loadMore()
          return next
        })
        return
      }
      if (nav === 'up') {
        if (index === 0) {
          reloadFeed()
          return
        }
        setIndex((i) => Math.max(0, i - 1))
        return
      }
      if (nav === 'top') {
        setIndex(0)
        return
      }
      if (nav === 'bottom') {
        setIndex(items.length - 1)
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

      const current = items[index]
      if (!current) return
      if (action === 'open-thread') imageExpand.collapseBeforeAction(() => onOpenThread(current.post.uri))
      if (action === 'reply') onReply(current.post)
      if (action === 'compose') onCompose()
      if (action === 'view-author') imageExpand.collapseBeforeAction(() => onOpenProfile(current.post.author.did))
      if (action === 'open-link') {
        if (current.post.linkCard && isSafeExternalUrl(current.post.linkCard.uri)) open(current.post.linkCard.uri).catch(() => {})
      }
      if (action === 'open-post') {
        open(postWebUrl(current.post)).catch(() => {})
      }
      if (action === 'delete') {
        if (current.post.author.did === client.did) {
          if (config.behavior.confirmDelete) {
            setConfirmAction({ type: 'delete', post: current.post })
          } else {
            performDelete(current.post)
          }
        }
      }
      if (action === 'like') {
        toggleLike(client, current.post).then((patch) => {
          setItems((prev) => prev.map((it, i) => (i === index ? { ...it, post: { ...it.post, ...patch } } : it)))
        })
      }
      if (action === 'repost') {
        setConfirmAction({ type: 'repost', post: current.post })
      }
      if (action === 'quote') {
        onQuote(current.post)
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
        if (action.type === 'delete') {
          performDelete(action.post)
        }
        if (action.type === 'repost') {
          toggleRepost(client, action.post)
            .then((patch) => {
              setItems((prev) => prev.map((it) => (it.post.uri === action.post.uri ? { ...it, post: { ...it.post, ...patch } } : it)))
              setActionError(undefined)
            })
            .catch(() => {
              setActionError('リポストに失敗しました')
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
        items={items}
        selectedIndex={index}
        availableRows={availableRows}
        isSelectedExpanded={imageExpand.isExpanded(true)}
        getKey={(item) => item.post.uri}
        renderItem={(item, selected, suppressImages) => (
          <PostItem
            post={item.post}
            selected={selected}
            expanded={!suppressImages && imageExpand.isExpanded(selected)}
            repostedByHandle={item.repostedBy?.handle}
            replyToHandle={item.replyToHandle}
            connectsToNext={item.connectsToNext}
            showThreadHint={item.isThreadRoot}
            indent={item.connectsToNext && !item.isSliceRoot}
            showReplyMarker={false}
          />
        )}
      />
      {confirmAction?.type === 'delete' && <ConfirmDialog message="この投稿を削除しますか?" />}
      {confirmAction?.type === 'repost' && (
        <ConfirmDialog
          message="この投稿をリポストしますか?"
          confirmLabel={confirmAction.post.viewerRepostUri ? 'y: リポスト解除' : 'y: リポスト'}
        />
      )}
    </Box>
  )
}
