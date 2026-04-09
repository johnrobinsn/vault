import { VaultService, type NoteMetadata, APIStorage } from '@vault/core'

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children: FileTreeNode[]
  expanded: boolean
}

export interface VaultInfo {
  id: string
  name: string
  path: string
}

class VaultState {
  service!: VaultService
  notes = $state<NoteMetadata[]>([])
  folders = $state<string[]>([])
  tree = $derived<FileTreeNode[]>(buildTree(this.notes, this.folders))
  initialized = $state(false)
  /** List of configured vaults from the server */
  vaults = $state<VaultInfo[]>([])
  /** Currently active vault */
  activeVault = $state<VaultInfo | null>(null)
  /** True if the backend server is reachable */
  serverReachable = $state(false)
  /** True during initial loading */
  loading = $state(true)

  private storage = new APIStorage('/api')

  private wireEvents() {
    this.service.events.on('note:created', () => this.refresh())
    this.service.events.on('note:saved', () => this.refresh())
    this.service.events.on('note:deleted', () => this.refresh())
    this.service.events.on('note:renamed', () => this.refresh())
    this.service.events.on('folder:created', () => this.refresh())
    this.service.events.on('folder:deleted', () => this.refresh())
    this.service.events.on('vault:cleared', () => this.refresh())
  }

  /**
   * Initialize: check server, load vault list, auto-open active vault.
   */
  async init() {
    try {
      const res = await fetch('/api/health')
      this.serverReachable = res.ok
    } catch {
      this.serverReachable = false
      this.loading = false
      return
    }

    await this.loadVaults()

    // Auto-open active vault if one is set
    if (this.activeVault) {
      this.service = new VaultService(this.storage)
      this.wireEvents()
      await this.refresh()
      this.initialized = true
    }

    this.loading = false
  }

  async loadVaults() {
    try {
      const res = await fetch('/api/vaults')
      const data = await res.json()
      this.vaults = data.vaults ?? []
      const activeId = data.activeVault
      this.activeVault = this.vaults.find((v) => v.id === activeId) ?? null
    } catch {
      this.vaults = []
      this.activeVault = null
    }
  }

  /**
   * Open an existing configured vault by ID.
   */
  async openVault(id: string) {
    await fetch(`/api/vaults/${id}/open`, { method: 'POST' })
    await this.loadVaults()
    this.service = new VaultService(this.storage)
    this.wireEvents()
    await this.refresh()
    this.initialized = true
  }

  /**
   * Create a new vault and open it.
   */
  async createVault(name: string, path: string) {
    const res = await fetch('/api/vaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, path }),
    })
    const entry: VaultInfo = await res.json()
    await this.openVault(entry.id)
  }

  /**
   * Remove a vault from the config (does NOT delete files).
   */
  async removeVault(id: string) {
    await fetch(`/api/vaults/${id}`, { method: 'DELETE' })
    if (this.activeVault?.id === id) {
      this.initialized = false
      this.notes = []
      this.folders = []
    }
    await this.loadVaults()
    // If there's a new active vault, open it
    if (this.activeVault && !this.initialized) {
      await this.openVault(this.activeVault.id)
    }
  }

  /**
   * Switch back to the vault picker screen.
   */
  switchVault() {
    this.initialized = false
    this.notes = []
    this.folders = []
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

  for (const [path, node] of folderNodes) {
    if (!path.includes('/')) {
      rootNodes.push(node)
    }
  }

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

export const vault = new VaultState()
