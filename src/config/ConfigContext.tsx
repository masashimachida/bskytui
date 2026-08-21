import React, { createContext, useContext } from 'react'
import type { Config } from './types.js'
import { DEFAULT_CONFIG } from './defaults.js'

const ConfigContext = createContext<Config>(DEFAULT_CONFIG)

export function ConfigProvider({ config, children }: { config: Config; children: React.ReactNode }) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useConfig(): Config {
  return useContext(ConfigContext)
}
