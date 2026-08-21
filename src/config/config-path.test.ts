import { describe, expect, test } from 'vitest'
import { resolveConfigPath } from './config-path.js'

describe('resolveConfigPath', () => {
  test('XDG_CONFIG_HOMEが設定されていればそちらを使う', () => {
    const path = resolveConfigPath({ XDG_CONFIG_HOME: '/custom/config', HOME: '/home/user' })
    expect(path).toBe('/custom/config/bskytui/config.yaml')
  })

  test('XDG_CONFIG_HOME未設定ならHOME/.configにフォールバックする', () => {
    const path = resolveConfigPath({ HOME: '/home/user' })
    expect(path).toBe('/home/user/.config/bskytui/config.yaml')
  })
})
