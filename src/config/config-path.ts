import path from 'node:path'

export function resolveConfigPath(env: { XDG_CONFIG_HOME?: string; HOME?: string }): string {
  const configHome = env.XDG_CONFIG_HOME || path.join(env.HOME ?? '', '.config')
  return path.join(configHome, 'bskytui', 'config.yaml')
}
