import type { InkKey, ListNavAction } from './types.js'
import type { KeymapConfig } from '../config/types.js'
import { DEFAULT_KEYMAP } from '../config/defaults.js'

export function resolveListNavigation(input: string, key: InkKey, keymap: KeymapConfig = DEFAULT_KEYMAP): ListNavAction | null {
  if (key.downArrow || input === keymap.listDown) return 'down'
  if (key.upArrow || input === keymap.listUp) return 'up'
  if (input === keymap.listTop) return 'top'
  if (input === keymap.listBottom) return 'bottom'
  return null
}
