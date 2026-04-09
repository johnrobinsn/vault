class UIState {
  sidebarVisible = $state(true)
  sidebarWidth = $state(260)
  theme = $state<'light' | 'dark'>('dark')
  commandPaletteOpen = $state(false)
  searchPanelOpen = $state(false)

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadTheme()
      this.loadSidebar()
    }
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible
    this.persistSidebar()
  }

  setSidebarWidth(width: number) {
    this.sidebarWidth = Math.max(180, Math.min(500, width))
    this.persistSidebar()
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark'
    this.applyTheme()
    this.persistTheme()
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme = theme
    this.applyTheme()
    this.persistTheme()
  }

  toggleCommandPalette() {
    this.commandPaletteOpen = !this.commandPaletteOpen
  }

  toggleSearchPanel() {
    this.searchPanelOpen = !this.searchPanelOpen
  }

  private applyTheme() {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = this.theme
    }
  }

  private loadTheme() {
    try {
      const saved = localStorage.getItem('vault:theme')
      if (saved === 'light' || saved === 'dark') {
        this.theme = saved
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        this.theme = 'light'
      }
      this.applyTheme()
    } catch {
      this.applyTheme()
    }
  }

  private persistTheme() {
    try {
      localStorage.setItem('vault:theme', this.theme)
    } catch {
      // ignore
    }
  }

  private loadSidebar() {
    try {
      const width = localStorage.getItem('vault:sidebarWidth')
      if (width) this.sidebarWidth = parseInt(width)
      const visible = localStorage.getItem('vault:sidebarVisible')
      if (visible !== null) this.sidebarVisible = visible !== 'false'
    } catch {
      // ignore
    }
  }

  private persistSidebar() {
    try {
      localStorage.setItem('vault:sidebarWidth', String(this.sidebarWidth))
      localStorage.setItem('vault:sidebarVisible', String(this.sidebarVisible))
    } catch {
      // ignore
    }
  }
}

export const ui = new UIState()
