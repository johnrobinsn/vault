import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface VaultEntry {
  id: string
  name: string
  path: string
}

export interface VaultConfig {
  vaults: VaultEntry[]
  activeVault: string | null
}

const CONFIG_DIR = path.join(os.homedir(), '.vault')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

function defaultConfig(): VaultConfig {
  return { vaults: [], activeVault: null }
}

export function loadConfig(): VaultConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw) as VaultConfig
  } catch {
    return defaultConfig()
  }
}

export function saveConfig(config: VaultConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export function addVault(name: string, vaultPath: string): VaultEntry {
  const config = loadConfig()
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || `vault-${Date.now()}`

  // Avoid duplicate IDs
  let uniqueId = id
  let counter = 1
  while (config.vaults.some((v) => v.id === uniqueId)) {
    uniqueId = `${id}-${counter++}`
  }

  const entry: VaultEntry = { id: uniqueId, name, path: path.resolve(vaultPath) }
  config.vaults.push(entry)
  if (!config.activeVault) {
    config.activeVault = entry.id
  }
  saveConfig(config)
  return entry
}

export function removeVault(id: string): boolean {
  const config = loadConfig()
  const idx = config.vaults.findIndex((v) => v.id === id)
  if (idx === -1) return false
  config.vaults.splice(idx, 1)
  if (config.activeVault === id) {
    config.activeVault = config.vaults[0]?.id ?? null
  }
  saveConfig(config)
  return true
}

export function setActiveVault(id: string): boolean {
  const config = loadConfig()
  const entry = config.vaults.find((v) => v.id === id)
  if (!entry) return false
  config.activeVault = id
  saveConfig(config)
  return true
}

export function getActiveVault(): VaultEntry | null {
  const config = loadConfig()
  if (!config.activeVault) return null
  return config.vaults.find((v) => v.id === config.activeVault) ?? null
}

export function getVault(id: string): VaultEntry | null {
  const config = loadConfig()
  return config.vaults.find((v) => v.id === id) ?? null
}
