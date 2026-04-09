import mitt from 'mitt'
import type { NoteMetadata } from './storage/types.js'

export type VaultEvents = {
  'note:created': NoteMetadata
  'note:saved': NoteMetadata
  'note:deleted': { path: string }
  'note:renamed': { oldPath: string; newPath: string }
  'note:moved': { oldPath: string; newPath: string }
  'folder:created': { path: string }
  'folder:deleted': { path: string }
  'vault:cleared': undefined
}

export function createEventBus() {
  return mitt<VaultEvents>()
}

export type VaultEventBus = ReturnType<typeof createEventBus>
