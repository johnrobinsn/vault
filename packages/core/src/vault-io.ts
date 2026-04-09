import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate'
import type { VaultService } from './vault-service.js'

/**
 * Export the entire vault as a .zip file (Uint8Array).
 */
export async function exportVault(service: VaultService): Promise<Uint8Array> {
  const notes = await service.getAllNotes()
  const files: Record<string, Uint8Array> = {}

  for (const meta of notes) {
    const content = await service.readNote(meta.path)
    if (content !== null) {
      files[meta.path] = strToU8(content)
    }
  }

  return zipSync(files, { level: 6 })
}

/**
 * Import a vault from a .zip file (Uint8Array).
 * Clears existing vault first.
 */
export async function importVault(
  service: VaultService,
  zipData: Uint8Array,
  clearFirst = true,
): Promise<number> {
  if (clearFirst) {
    await service.clear()
  }

  const files = unzipSync(zipData)
  let count = 0

  for (const [path, data] of Object.entries(files)) {
    // Skip directories and non-markdown files
    if (path.endsWith('/')) continue
    if (!path.endsWith('.md')) continue
    // Skip macOS metadata files
    if (path.includes('__MACOSX')) continue

    const content = strFromU8(data)
    await service.createNote(path, content)
    count++
  }

  return count
}

