import type { GlobalAction, InkKey } from './types.js'
import type { KeymapConfig } from '../config/types.js'
import { DEFAULT_KEYMAP } from '../config/defaults.js'

export function resolveGlobalAction(input: string, key: InkKey, keymap: KeymapConfig = DEFAULT_KEYMAP): GlobalAction | null {
  if (input === keymap.help) return 'help'
  if (input === keymap.quote) return 'quote'
  if (key.escape || input === keymap.back) return 'back'
  if (key.return) return 'open-thread'
  if (input === keymap.switchTimeline) return 'switch-timeline'
  if (input === keymap.switchNotifications) return 'switch-notifications'
  if (input === keymap.switchFeeds) return 'switch-feeds'
  if (input === keymap.switchProfile) return 'switch-profile'
  if (input === keymap.like) return 'like'
  if (input === keymap.repost) return 'repost'
  if (input === keymap.reply) return 'reply'
  if (input === keymap.compose) return 'compose'
  if (input === keymap.openLink) return 'open-link'
  if (input === keymap.openPost) return 'open-post'
  if (input === keymap.viewImage) return 'view-image'
  if (input === keymap.viewAuthor) return 'view-author'
  if (input === keymap.delete) return 'delete'
  return null
}
