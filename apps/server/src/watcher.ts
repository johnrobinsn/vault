import fs from 'node:fs'
import path from 'node:path'
import { WebSocketServer, type WebSocket } from 'ws'
import type { Server } from 'node:http'
import { getActiveVault } from './config.js'

export interface FileChangeEvent {
  type: 'change' | 'add' | 'delete'
  path: string
  /** Unix timestamp ms of the file on disk (null for deletes) */
  mtime: number | null
}

let wss: WebSocketServer | null = null
let currentWatcher: fs.FSWatcher | null = null
let currentVaultPath: string | null = null
// Debounce to avoid duplicate events from editors that write temp files
const pending = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 300
// Track files we just wrote via the API, so we don't echo them back
const recentWrites = new Map<string, number>()
const WRITE_GRACE_MS = 1000

/**
 * Register a file path as recently written by the server API.
 * The watcher will ignore the next change event for this file.
 */
export function markRecentWrite(filePath: string) {
  recentWrites.set(filePath, Date.now())
}

/**
 * Attach a WebSocket server to the HTTP server and start watching
 * the active vault directory.
 */
export function initWatcher(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    // When a new client connects, start watching if not already
    ensureWatching()
  })

  // Start watching immediately if a vault is active
  ensureWatching()
}

function broadcast(event: FileChangeEvent) {
  if (!wss) return
  const msg = JSON.stringify(event)
  for (const client of wss.clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg)
    }
  }
}

function ensureWatching() {
  const vault = getActiveVault()
  if (!vault) return

  // Already watching this vault
  if (currentVaultPath === vault.path && currentWatcher) return

  // Switch to new vault
  stopWatching()
  startWatching(vault.path)
}

function startWatching(vaultPath: string) {
  currentVaultPath = vaultPath

  try {
    currentWatcher = fs.watch(vaultPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return
      // Skip hidden files and non-markdown files
      if (filename.startsWith('.') || filename.includes('/.')) return
      if (!filename.endsWith('.md')) return

      const relPath = filename.replace(/\\/g, '/') // normalize Windows paths

      // Debounce: many editors trigger multiple events per save
      const existing = pending.get(relPath)
      if (existing) clearTimeout(existing)

      pending.set(relPath, setTimeout(() => {
        pending.delete(relPath)
        handleFileEvent(vaultPath, relPath)
      }, DEBOUNCE_MS))
    })
  } catch (err) {
    console.error('Failed to start file watcher:', err)
  }
}

function stopWatching() {
  if (currentWatcher) {
    currentWatcher.close()
    currentWatcher = null
  }
  currentVaultPath = null
  for (const timeout of pending.values()) {
    clearTimeout(timeout)
  }
  pending.clear()
}

function handleFileEvent(vaultPath: string, relPath: string) {
  const fullPath = path.join(vaultPath, relPath)

  // Check if this was a recent write from our own API
  const writeTime = recentWrites.get(relPath)
  if (writeTime && Date.now() - writeTime < WRITE_GRACE_MS) {
    recentWrites.delete(relPath)
    return // Skip — this change came from us
  }
  recentWrites.delete(relPath)

  try {
    const stat = fs.statSync(fullPath)
    broadcast({
      type: 'change',
      path: relPath,
      mtime: stat.mtimeMs,
    })
  } catch {
    // File was deleted
    broadcast({
      type: 'delete',
      path: relPath,
      mtime: null,
    })
  }
}

/**
 * Call when the active vault changes so the watcher switches directories.
 */
export function restartWatcher() {
  ensureWatching()
}
