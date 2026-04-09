import fs from 'node:fs/promises'
import path from 'node:path'
import type { FileMetadata, ServerStorage } from './types.js'

/**
 * Server-side storage backed by the local filesystem.
 * A vault is a folder containing .md files.
 */
export class LocalFSStorage implements ServerStorage {
  private root: string

  constructor(rootPath: string) {
    this.root = rootPath
  }

  private resolve(filePath: string): string {
    // Prevent path traversal attacks
    const resolved = path.resolve(this.root, filePath)
    if (!resolved.startsWith(this.root)) {
      throw new Error('Path traversal detected')
    }
    return resolved
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(this.resolve(filePath), 'utf-8')
    } catch {
      return null
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const full = this.resolve(filePath)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, content, 'utf-8')
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(filePath))
    } catch {
      // File may not exist
    }
  }

  async moveFile(oldPath: string, newPath: string): Promise<void> {
    const oldFull = this.resolve(oldPath)
    const newFull = this.resolve(newPath)
    await fs.mkdir(path.dirname(newFull), { recursive: true })
    await fs.rename(oldFull, newFull)
  }

  async listFiles(): Promise<FileMetadata[]> {
    const results: FileMetadata[] = []
    await this.walkFiles(this.root, '', results)
    return results
  }

  async createFolder(folderPath: string): Promise<void> {
    await fs.mkdir(this.resolve(folderPath), { recursive: true })
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      await fs.rm(this.resolve(folderPath), { recursive: true })
    } catch {
      // Folder may not exist
    }
  }

  async listFolders(): Promise<string[]> {
    const results: string[] = []
    await this.walkFolders(this.root, '', results)
    return results
  }

  private async walkFiles(
    dir: string,
    prefix: string,
    results: FileMetadata[],
  ): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const stat = await fs.stat(fullPath)
          const name = entry.name.slice(0, -3) // remove .md
          results.push({
            path: relPath,
            title: name,
            created: stat.birthtimeMs,
            modified: stat.mtimeMs,
            size: stat.size,
          })
        } catch {
          // Skip unreadable files
        }
      } else if (entry.isDirectory()) {
        await this.walkFiles(fullPath, relPath, results)
      }
    }
  }

  private async walkFolders(
    dir: string,
    prefix: string,
    results: string[],
  ): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) {
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
        results.push(relPath)
        await this.walkFolders(path.join(dir, entry.name), relPath, results)
      }
    }
  }
}
