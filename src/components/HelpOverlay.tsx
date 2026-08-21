import React from 'react'
import { Box, Text } from 'ink'
import { useConfig } from '../config/ConfigContext.js'
import type { KeymapConfig } from '../config/types.js'

function buildRows(keymap: KeymapConfig): Array<[string, string]> {
  return [
    [`${keymap.listDown} / ${keymap.listUp}`, '下 / 上に移動'],
    [`${keymap.listTop} / ${keymap.listBottom}`, '先頭 / 末尾へ'],
    ['Enter', 'スレッドを開く'],
    [`Esc / ${keymap.back}`, '戻る'],
    [`${keymap.switchTimeline} / ${keymap.switchNotifications} / ${keymap.switchProfile}`, 'タイムライン / 通知 / プロフィール切替'],
    [keymap.switchFeeds, 'フィード一覧'],
    [keymap.like, 'いいね'],
    [keymap.repost, 'リポスト'],
    [keymap.reply, '返信'],
    [keymap.quote, '引用リポスト'],
    [keymap.viewAuthor, '投稿者のプロフィールを開く'],
    [keymap.delete, '自分の投稿を削除'],
    ['F', '(プロフィール画面)フォロー/解除'],
    ['M', '(プロフィール画面)ミュート/解除'],
    ['B', '(プロフィール画面)ブロック/解除'],
    [keymap.openLink, '外部リンクカードをブラウザで開く'],
    [keymap.openPost, '投稿をブラウザで開く'],
    [keymap.compose, '新規投稿'],
    ['Ctrl+C', '終了'],
    ['Q', 'ログアウト'],
  ]
}

export function HelpOverlay() {
  const config = useConfig()
  const rows = buildRows(config.keymap)
  return (
    <Box flexDirection="column" borderStyle="double" padding={1}>
      <Text bold>キー操作一覧</Text>
      {rows.map(([key, desc]) => (
        <Box key={key} gap={1}>
          <Box width={10}>
            <Text color="cyan">{key}</Text>
          </Box>
          <Text>{desc}</Text>
        </Box>
      ))}
      <Text dimColor>任意のキーで閉じる</Text>
    </Box>
  )
}
