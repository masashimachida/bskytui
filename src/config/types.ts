export interface KeymapConfig {
  help: string
  quote: string
  back: string
  switchTimeline: string
  switchNotifications: string
  switchFeeds: string
  switchProfile: string
  like: string
  repost: string
  reply: string
  compose: string
  openLink: string
  openPost: string
  viewImage: string
  viewAuthor: string
  delete: string
  listUp: string
  listDown: string
  listTop: string
  listBottom: string
}

export type ImageExpandMode = 'never' | 'selected' | 'always'

export interface DisplayConfig {
  showImages: boolean
  dateFormat: 'relative' | 'absolute'
  imageMaxWidth: number
  imageExpand: ImageExpandMode
}

export interface BehaviorConfig {
  confirmDelete: boolean
}

export interface Config {
  keymap: KeymapConfig
  display: DisplayConfig
  behavior: BehaviorConfig
}
