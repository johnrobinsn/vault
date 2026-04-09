import { openDB } from 'idb'

const DB_NAME = 'vault-handles'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const HANDLE_KEY = 'vault-root'

/**
 * Persist a FileSystemDirectoryHandle in IndexedDB so the vault
 * can reconnect to the same folder after page reload.
 */
export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
  await db.put(STORE_NAME, handle, HANDLE_KEY)
}

/**
 * Retrieve a previously saved FileSystemDirectoryHandle.
 * Returns null if none was saved.
 */
export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
    const handle = await db.get(STORE_NAME, HANDLE_KEY)
    return handle ?? null
  } catch {
    return null
  }
}

/**
 * Clear the saved directory handle (e.g., when user disconnects vault).
 */
export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
    await db.delete(STORE_NAME, HANDLE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Check if the File System Access API is available.
 */
export function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Request readwrite permission on a handle. Returns true if granted.
 */
export async function requestPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const opts = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  return (await handle.requestPermission(opts)) === 'granted'
}
