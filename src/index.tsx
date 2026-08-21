#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { App } from './App.js'
import { loadConfig } from './config/load-config.js'
import { resolveConfigPath } from './config/config-path.js'

const { config, warnings } = loadConfig(resolveConfigPath(process.env))
for (const warning of warnings) {
  console.error(`[bskytui] ${warning}`)
}

render(<App config={config} />, { kittyKeyboard: { mode: 'auto' } })
