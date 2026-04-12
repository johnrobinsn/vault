import { vault } from './vault.svelte.js'
import { tabs } from './tabs.svelte.js'
import { activeEditor } from './editor.svelte.js'

export interface FileChangeEvent {
  type: 'change' | 'add' | 'delete'
  path: string
  mtime: number | null
}

export interface ConflictInfo {
  path: string
  diskContent: string
}

class WatcherState {
  connected = $state(false)
  /** File that has a conflict (dirty in editor + changed on disk) */
  conflict = $state<ConflictInfo | null>(null)

  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  connect() {
    if (this.ws) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/ws`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.connected = true
      }

      this.ws.onclose = () => {
        this.connected = false
        this.ws = null
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }

      this.ws.onmessage = (event) => {
        try {
          const data: FileChangeEvent = JSON.parse(event.data)
          this.handleEvent(data)
        } catch {
          // Ignore malformed messages
        }
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 3000)
  }

  private async handleEvent(event: FileChangeEvent) {
    if (event.type === 'delete') {
      // File deleted externally — refresh the tree
      await vault.refresh()
      return
    }

    // File changed or added
    if (event.type === 'add') {
      await vault.refresh()
      return
    }

    // type === 'change'
    // Is this file open in a tab?
    const tab = tabs.tabs.find((t) => t.path === event.path)

    if (!tab) {
      // Not open — just refresh the tree metadata
      await vault.refresh()
      return
    }

    if (tab.dirty) {
      // File is dirty in editor AND changed on disk → conflict
      const diskContent = await vault.readNote(event.path)
      if (diskContent !== null) {
        this.conflict = { path: event.path, diskContent }
      }
      return
    }

    // File is open but not dirty — auto-reload silently
    const content = await vault.readNote(event.path)
    if (content !== null && activeEditor.view) {
      // Check if the active editor is showing this file
      if (tabs.activeTab?.path === event.path) {
        const currentDoc = activeEditor.view.state.doc.toString()
        if (content !== currentDoc) {
          activeEditor.view.dispatch({
            changes: {
              from: 0,
              to: activeEditor.view.state.doc.length,
              insert: content,
            },
          })
        }
      }
    }
  }

  // --- Conflict resolution ---

  /** Keep the editor version, discard disk changes. Save editor content to disk. */
  async resolveKeepEditor() {
    if (!this.conflict) return
    const { path } = this.conflict
    // The editor content is already what the user wants — just save it
    activeEditor.saveNow?.()
    this.conflict = null
  }

  /** Load the disk version, discard editor changes. */
  async resolveLoadDisk() {
    if (!this.conflict || !activeEditor.view) return
    const { path, diskContent } = this.conflict

    if (tabs.activeTab?.path === path) {
      activeEditor.view.dispatch({
        changes: {
          from: 0,
          to: activeEditor.view.state.doc.length,
          insert: diskContent,
        },
      })
      // Mark as clean since we just loaded the disk version
      const tab = tabs.tabs.find((t) => t.path === path)
      if (tab) tabs.markDirty(tab.id, false)
    }
    this.conflict = null
  }

  /** Save the editor version under a new name so user can compare. */
  async resolveSaveAs() {
    if (!this.conflict || !activeEditor.view) return
    const { path } = this.conflict

    if (tabs.activeTab?.path === path) {
      const content = activeEditor.view.state.doc.toString()
      const stem = path.endsWith('.md') ? path.slice(0, -3) : path
      const newPath = `${stem} (conflict).md`
      await vault.service.createNote(newPath, content)

      // Load the disk version into the current editor
      await this.resolveLoadDisk()

      // Open the conflict copy in a new tab
      tabs.open(newPath)
    } else {
      this.conflict = null
    }
  }
}

export const watcher = new WatcherState()
