import fs from 'node:fs'
import YAML from 'yaml'
import type { Config } from './types.js'
import { DEFAULT_BEHAVIOR, DEFAULT_CONFIG, DEFAULT_DISPLAY, DEFAULT_KEYMAP } from './defaults.js'

export interface ParseConfigResult {
  config: Config
  warnings: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseKeymap(raw: unknown, warnings: string[]): Config['keymap'] {
  const result = { ...DEFAULT_KEYMAP }
  if (!isPlainObject(raw)) return result

  const usedBy = new Map<string, string[]>()
  for (const action of Object.keys(DEFAULT_KEYMAP) as Array<keyof Config['keymap']>) {
    const value = raw[action]
    if (value === undefined) {
      usedBy.set(result[action], [...(usedBy.get(result[action]) ?? []), action])
      continue
    }
    if (typeof value !== 'string' || value.length !== 1) {
      warnings.push(`keymap.${action}: 1文字のキーではないため既定値を使用します`)
      usedBy.set(result[action], [...(usedBy.get(result[action]) ?? []), action])
      continue
    }
    result[action] = value
    usedBy.set(value, [...(usedBy.get(value) ?? []), action])
  }

  for (const [key, actions] of usedBy) {
    if (actions.length <= 1) continue
    warnings.push(`keymap: キー "${key}" が複数のアクション(${actions.join(', ')})に割り当てられているため既定値を使用します`)
    for (const action of actions) {
      result[action as keyof Config['keymap']] = DEFAULT_KEYMAP[action as keyof Config['keymap']]
    }
  }

  return result
}

function parseDisplay(raw: unknown, warnings: string[]): Config['display'] {
  const result = { ...DEFAULT_DISPLAY }
  if (!isPlainObject(raw)) return result

  if (raw.showImages !== undefined) {
    if (typeof raw.showImages === 'boolean') {
      result.showImages = raw.showImages
    } else {
      warnings.push('display.showImages: true/falseではないため既定値を使用します')
    }
  }

  if (raw.dateFormat !== undefined) {
    if (raw.dateFormat === 'relative' || raw.dateFormat === 'absolute') {
      result.dateFormat = raw.dateFormat
    } else {
      warnings.push('display.dateFormat: relativeまたはabsoluteではないため既定値を使用します')
    }
  }

  if (raw.imageMaxWidth !== undefined) {
    if (typeof raw.imageMaxWidth === 'number' && raw.imageMaxWidth > 0) {
      result.imageMaxWidth = raw.imageMaxWidth
    } else {
      warnings.push('display.imageMaxWidth: 正の数値ではないため既定値を使用します')
    }
  }

  if (raw.imageExpand !== undefined) {
    if (raw.imageExpand === 'never' || raw.imageExpand === 'selected' || raw.imageExpand === 'always') {
      result.imageExpand = raw.imageExpand
    } else {
      warnings.push('display.imageExpand: never/selected/alwaysのいずれでもないため既定値を使用します')
    }
  }

  return result
}

function parseBehavior(raw: unknown, warnings: string[]): Config['behavior'] {
  const result = { ...DEFAULT_BEHAVIOR }
  if (!isPlainObject(raw)) return result

  if (raw.confirmDelete !== undefined) {
    if (typeof raw.confirmDelete === 'boolean') {
      result.confirmDelete = raw.confirmDelete
    } else {
      warnings.push('behavior.confirmDelete: true/falseではないため既定値を使用します')
    }
  }

  return result
}

export function parseConfig(yamlText: string): ParseConfigResult {
  let parsed: unknown
  try {
    parsed = YAML.parse(yamlText)
  } catch {
    return { config: DEFAULT_CONFIG, warnings: ['設定ファイルのYAML構文が不正なため既定値を使用します'] }
  }

  if (parsed === null || parsed === undefined) {
    return { config: DEFAULT_CONFIG, warnings: [] }
  }

  if (!isPlainObject(parsed)) {
    return { config: DEFAULT_CONFIG, warnings: ['設定ファイルの形式が不正なため既定値を使用します'] }
  }

  const warnings: string[] = []
  const config: Config = {
    keymap: parseKeymap(parsed.keymap, warnings),
    display: parseDisplay(parsed.display, warnings),
    behavior: parseBehavior(parsed.behavior, warnings),
  }
  return { config, warnings }
}

export function loadConfig(configPath: string): ParseConfigResult {
  let text: string
  try {
    text = fs.readFileSync(configPath, 'utf-8')
  } catch {
    return { config: DEFAULT_CONFIG, warnings: [] }
  }
  return parseConfig(text)
}
