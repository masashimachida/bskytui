import type { Config } from './types.js'

export const DEFAULT_KEYMAP: Config['keymap'] = {
  help: '?',
  quote: 'q',
  back: 'h',
  switchTimeline: '1',
  switchNotifications: '2',
  switchFeeds: '3',
  switchProfile: '4',
  like: 'f',
  repost: 'R',
  reply: 'r',
  compose: 'n',
  openLink: 'o',
  openPost: 'O',
  viewImage: 'i',
  viewAuthor: 'u',
  delete: 'd',
  listUp: 'k',
  listDown: 'j',
  listTop: 'g',
  listBottom: 'G',
}

export const DEFAULT_DISPLAY: Config['display'] = {
  showImages: true,
  dateFormat: 'relative',
  imageMaxWidth: 30,
  imageExpand: 'selected',
}

export const DEFAULT_BEHAVIOR: Config['behavior'] = {
  confirmDelete: true,
}

export const DEFAULT_CONFIG: Config = {
  keymap: DEFAULT_KEYMAP,
  display: DEFAULT_DISPLAY,
  behavior: DEFAULT_BEHAVIOR,
}
