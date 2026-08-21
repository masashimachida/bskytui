import { describe, expect, test } from 'vitest'
import { parseConfig } from './load-config.js'
import { DEFAULT_CONFIG } from './defaults.js'

describe('parseConfig', () => {
  test('正常なYAMLで指定した項目のみ上書きされる', () => {
    const yaml = `
keymap:
  like: L
display:
  showImages: false
behavior:
  confirmDelete: false
`
    const { config, warnings } = parseConfig(yaml)
    expect(config.keymap.like).toBe('L')
    expect(config.keymap.repost).toBe(DEFAULT_CONFIG.keymap.repost)
    expect(config.display.showImages).toBe(false)
    expect(config.display.dateFormat).toBe(DEFAULT_CONFIG.display.dateFormat)
    expect(config.behavior.confirmDelete).toBe(false)
    expect(warnings).toEqual([])
  })

  test('YAML構文エラーなら全体デフォルトにフォールバックし警告を返す', () => {
    const yaml = `keymap:\n  like: [broken`
    const { config, warnings } = parseConfig(yaml)
    expect(config).toEqual(DEFAULT_CONFIG)
    expect(warnings.length).toBe(1)
  })

  test('トップレベルがオブジェクトでなければ全体デフォルトにフォールバックする', () => {
    const { config, warnings } = parseConfig('- just\n- a\n- list')
    expect(config).toEqual(DEFAULT_CONFIG)
    expect(warnings.length).toBe(1)
  })

  test('keymapの値が1文字の文字列でない場合そのフィールドのみデフォルトに戻す', () => {
    const yaml = `
keymap:
  like: toolong
  repost: R2
`
    const { config, warnings } = parseConfig(yaml)
    expect(config.keymap.like).toBe(DEFAULT_CONFIG.keymap.like)
    expect(config.keymap.repost).toBe(DEFAULT_CONFIG.keymap.repost)
    expect(warnings.length).toBe(2)
  })

  test('keymap内で同じキーが重複割り当てされた場合、重複した全エントリをデフォルトに戻す', () => {
    const yaml = `
keymap:
  like: x
  reply: x
`
    const { config, warnings } = parseConfig(yaml)
    expect(config.keymap.like).toBe(DEFAULT_CONFIG.keymap.like)
    expect(config.keymap.reply).toBe(DEFAULT_CONFIG.keymap.reply)
    expect(warnings.length).toBe(1)
  })

  test('display.dateFormatが不正な値ならデフォルトに戻す', () => {
    const yaml = `
display:
  dateFormat: nonsense
`
    const { config, warnings } = parseConfig(yaml)
    expect(config.display.dateFormat).toBe(DEFAULT_CONFIG.display.dateFormat)
    expect(warnings.length).toBe(1)
  })

  test('display.imageMaxWidthが正の数でなければデフォルトに戻す', () => {
    const yaml = `
display:
  imageMaxWidth: -5
`
    const { config, warnings } = parseConfig(yaml)
    expect(config.display.imageMaxWidth).toBe(DEFAULT_CONFIG.display.imageMaxWidth)
    expect(warnings.length).toBe(1)
  })

  test('display.imageExpandが不正な値ならデフォルトに戻す', () => {
    const yaml = `
display:
  imageExpand: sometimes
`
    const { config, warnings } = parseConfig(yaml)
    expect(config.display.imageExpand).toBe(DEFAULT_CONFIG.display.imageExpand)
    expect(warnings.length).toBe(1)
  })

  test('display.imageExpandがneverやalwaysなら反映される', () => {
    const { config, warnings } = parseConfig('display:\n  imageExpand: always\n')
    expect(config.display.imageExpand).toBe('always')
    expect(warnings).toEqual([])
  })

  test('display.showImagesがboolean以外ならデフォルトに戻す', () => {
    const yaml = `
display:
  showImages: yes-please
`
    const { config, warnings } = parseConfig(yaml)
    expect(config.display.showImages).toBe(DEFAULT_CONFIG.display.showImages)
    expect(warnings.length).toBe(1)
  })

  test('behavior.confirmDeleteがboolean以外ならデフォルトに戻す', () => {
    const yaml = `
behavior:
  confirmDelete: sometimes
`
    const { config, warnings } = parseConfig(yaml)
    expect(config.behavior.confirmDelete).toBe(DEFAULT_CONFIG.behavior.confirmDelete)
    expect(warnings.length).toBe(1)
  })

  test('空文字列ならデフォルト設定を返す', () => {
    const { config, warnings } = parseConfig('')
    expect(config).toEqual(DEFAULT_CONFIG)
    expect(warnings).toEqual([])
  })
})
