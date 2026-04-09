class TabsState {
  tabs = $state<Tab[]>([])
  activeId = $state<string | null>(null)
  activeTab = $derived(this.tabs.find((t) => t.id === this.activeId) ?? null)

  open(path: string) {
    const existing = this.tabs.find((t) => t.path === path)
    if (existing) {
      this.activeId = existing.id
      return
    }

    const tab: Tab = {
      id: crypto.randomUUID(),
      path,
      title: titleFromPath(path),
      dirty: false,
    }
    this.tabs = [...this.tabs, tab]
    this.activeId = tab.id
    this.persist()
  }

  close(id: string) {
    const idx = this.tabs.findIndex((t) => t.id === id)
    if (idx === -1) return

    this.tabs = this.tabs.filter((t) => t.id !== id)

    if (this.activeId === id) {
      // Activate adjacent tab
      if (this.tabs.length > 0) {
        const newIdx = Math.min(idx, this.tabs.length - 1)
        this.activeId = this.tabs[newIdx].id
      } else {
        this.activeId = null
      }
    }
    this.persist()
  }

  closeAll() {
    this.tabs = []
    this.activeId = null
    this.persist()
  }

  activate(id: string) {
    if (this.tabs.some((t) => t.id === id)) {
      this.activeId = id
      this.persist()
    }
  }

  activateNext() {
    if (this.tabs.length <= 1) return
    const idx = this.tabs.findIndex((t) => t.id === this.activeId)
    const next = (idx + 1) % this.tabs.length
    this.activeId = this.tabs[next].id
    this.persist()
  }

  activatePrev() {
    if (this.tabs.length <= 1) return
    const idx = this.tabs.findIndex((t) => t.id === this.activeId)
    const prev = (idx - 1 + this.tabs.length) % this.tabs.length
    this.activeId = this.tabs[prev].id
    this.persist()
  }

  markDirty(id: string, dirty: boolean) {
    const tab = this.tabs.find((t) => t.id === id)
    if (tab) tab.dirty = dirty
  }

  updatePath(oldPath: string, newPath: string) {
    const tab = this.tabs.find((t) => t.path === oldPath)
    if (tab) {
      tab.path = newPath
      tab.title = titleFromPath(newPath)
      this.persist()
    }
  }

  removeByPath(path: string) {
    const tab = this.tabs.find((t) => t.path === path)
    if (tab) this.close(tab.id)
  }

  reorder(fromIdx: number, toIdx: number) {
    const items = [...this.tabs]
    const [moved] = items.splice(fromIdx, 1)
    items.splice(toIdx, 0, moved)
    this.tabs = items
    this.persist()
  }

  persist() {
    try {
      const data = {
        tabs: this.tabs.map((t) => ({ path: t.path })),
        activeIdx: this.tabs.findIndex((t) => t.id === this.activeId),
      }
      localStorage.setItem('vault:tabs', JSON.stringify(data))
    } catch {
      // localStorage might be unavailable
    }
  }

  restore() {
    try {
      const raw = localStorage.getItem('vault:tabs')
      if (!raw) return
      const data = JSON.parse(raw)
      if (Array.isArray(data.tabs)) {
        for (const { path } of data.tabs) {
          this.open(path)
        }
        if (typeof data.activeIdx === 'number' && this.tabs[data.activeIdx]) {
          this.activeId = this.tabs[data.activeIdx].id
        }
      }
    } catch {
      // Ignore corrupt data
    }
  }
}

interface Tab {
  id: string
  path: string
  title: string
  dirty: boolean
}

function titleFromPath(path: string): string {
  const name = path.split('/').pop() ?? path
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

export type { Tab }
export const tabs = new TabsState()
