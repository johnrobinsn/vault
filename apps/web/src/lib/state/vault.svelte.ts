import { VaultService, type NoteMetadata, IDBStorage } from '@vault/core'

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children: FileTreeNode[]
  expanded: boolean
}

class VaultState {
  service: VaultService
  notes = $state<NoteMetadata[]>([])
  folders = $state<string[]>([])
  tree = $derived<FileTreeNode[]>(buildTree(this.notes, this.folders))
  initialized = $state(false)

  constructor() {
    this.service = new VaultService(new IDBStorage())

    // Listen for changes and refresh
    this.service.events.on('note:created', () => this.refresh())
    this.service.events.on('note:saved', () => this.refresh())
    this.service.events.on('note:deleted', () => this.refresh())
    this.service.events.on('note:renamed', () => this.refresh())
    this.service.events.on('folder:created', () => this.refresh())
    this.service.events.on('folder:deleted', () => this.refresh())
    this.service.events.on('vault:cleared', () => this.refresh())
  }

  async init() {
    if (this.initialized) return

    const allNotes = await this.service.getAllNotes()
    if (allNotes.length === 0) {
      // First-time setup: create welcome note
      await this.service.createNote(
        'Welcome.md',
        `# Welcome to Vault

Vault is a markdown editor for connected notes.

## Getting Started

- Create a new note with **Ctrl+N**
- Link notes with \`[[wiki-links]]\`
- Search with **Ctrl+Shift+F**
- Command palette with **Ctrl+P**

Happy writing!
`,
      )
    }

    await this.refresh()
    this.initialized = true
  }

  async refresh() {
    this.notes = await this.service.getAllNotes()
    this.folders = await this.service.listFolders()
  }

  async createNote(folder?: string): Promise<NoteMetadata> {
    const basePath = folder ? `${folder}/Untitled.md` : 'Untitled.md'
    const path = await this.service.generateUniquePath(basePath)
    return this.service.createNote(path, '')
  }

  async createFolder(parentFolder?: string): Promise<void> {
    const basePath = parentFolder ? `${parentFolder}/New Folder` : 'New Folder'
    // Generate unique folder name
    const existing = await this.service.listFolders()
    let path = basePath
    let counter = 1
    while (existing.includes(path)) {
      path = `${basePath} ${counter}`
      counter++
    }
    await this.service.createFolder(path)
  }

  async saveNote(path: string, content: string): Promise<void> {
    await this.service.saveNote(path, content)
  }

  async deleteNote(path: string): Promise<void> {
    await this.service.deleteNote(path)
  }

  async renameNote(oldPath: string, newPath: string): Promise<void> {
    await this.service.renameNote(oldPath, newPath)
  }

  async readNote(path: string): Promise<string | null> {
    return this.service.readNote(path)
  }

  async moveNote(notePath: string, folderPath: string): Promise<void> {
    await this.service.moveNoteToFolder(notePath, folderPath)
  }

  async deleteFolder(path: string): Promise<void> {
    await this.service.deleteFolder(path)
  }

  getNoteList(): { path: string; title: string }[] {
    return this.notes.map((n) => ({ path: n.path, title: n.title }))
  }
}

function buildTree(notes: NoteMetadata[], folders: string[]): FileTreeNode[] {
  const folderNodes = new Map<string, FileTreeNode>()

  // Create folder nodes
  for (const f of folders) {
    if (f === '.trash') continue
    const parts = f.split('/')
    const name = parts[parts.length - 1]
    folderNodes.set(f, {
      name,
      path: f,
      type: 'folder',
      children: [],
      expanded: true,
    })
  }

  // Nest folders
  for (const [path, node] of folderNodes) {
    const parentIdx = path.lastIndexOf('/')
    if (parentIdx > 0) {
      const parentPath = path.slice(0, parentIdx)
      const parent = folderNodes.get(parentPath)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  // Create file nodes and add to their parent folders
  const rootNodes: FileTreeNode[] = []
  for (const note of notes) {
    const node: FileTreeNode = {
      name: note.title + '.md',
      path: note.path,
      type: 'file',
      children: [],
      expanded: false,
    }

    const parentIdx = note.path.lastIndexOf('/')
    if (parentIdx > 0) {
      const parentPath = note.path.slice(0, parentIdx)
      const parent = folderNodes.get(parentPath)
      if (parent) {
        parent.children.push(node)
      } else {
        rootNodes.push(node)
      }
    } else {
      rootNodes.push(node)
    }
  }

  // Add top-level folders to root
  for (const [path, node] of folderNodes) {
    if (!path.includes('/')) {
      rootNodes.push(node)
    }
  }

  // Sort: folders first, then alphabetically
  return sortNodes(rootNodes)
}

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  for (const n of nodes) {
    if (n.children.length > 0) {
      n.children = sortNodes(n.children)
    }
  }
  return nodes
}

// Singleton instance
export const vault = new VaultState()
