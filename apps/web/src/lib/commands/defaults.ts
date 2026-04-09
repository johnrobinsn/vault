import { commandRegistry } from './registry.js'
import { vault } from '$lib/state/vault.svelte.js'
import { tabs } from '$lib/state/tabs.svelte.js'
import { ui } from '$lib/state/ui.svelte.js'
import { exportVault, importVault } from '@vault/core'

export function registerDefaultCommands() {
  commandRegistry.register({
    id: 'note:new',
    label: 'New Note',
    shortcut: 'Ctrl+N',
    execute: () => {
      vault.createNote().then((meta) => tabs.open(meta.path))
    },
  })

  commandRegistry.register({
    id: 'folder:new',
    label: 'New Folder',
    execute: () => {
      vault.createFolder()
    },
  })

  commandRegistry.register({
    id: 'tab:close',
    label: 'Close Tab',
    shortcut: 'Ctrl+W',
    execute: () => {
      if (tabs.activeTab) tabs.close(tabs.activeTab.id)
    },
  })

  commandRegistry.register({
    id: 'tab:next',
    label: 'Next Tab',
    shortcut: 'Ctrl+Tab',
    execute: () => tabs.activateNext(),
  })

  commandRegistry.register({
    id: 'tab:prev',
    label: 'Previous Tab',
    shortcut: 'Ctrl+Shift+Tab',
    execute: () => tabs.activatePrev(),
  })

  commandRegistry.register({
    id: 'ui:toggle-theme',
    label: 'Toggle Theme',
    execute: () => ui.toggleTheme(),
  })

  commandRegistry.register({
    id: 'ui:toggle-sidebar',
    label: 'Toggle Sidebar',
    shortcut: 'Ctrl+B',
    execute: () => ui.toggleSidebar(),
  })

  commandRegistry.register({
    id: 'search:open',
    label: 'Search Notes',
    shortcut: 'Ctrl+Shift+F',
    execute: () => ui.toggleSearchPanel(),
  })

  commandRegistry.register({
    id: 'palette:open',
    label: 'Command Palette',
    shortcut: 'Ctrl+P',
    execute: () => ui.toggleCommandPalette(),
  })

  commandRegistry.register({
    id: 'vault:export',
    label: 'Export Vault as ZIP',
    execute: async () => {
      const data = await exportVault(vault.service)
      const blob = new Blob([data as BlobPart], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vault-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  commandRegistry.register({
    id: 'vault:import',
    label: 'Import Vault from ZIP',
    execute: () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.zip'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const data = new Uint8Array(await file.arrayBuffer())
        const count = await importVault(vault.service, data)
        tabs.closeAll()
        await vault.refresh()
        refreshNoteCommands()
        alert(`Imported ${count} notes.`)
      }
      input.click()
    },
  })

  // Quick switcher - open any note by name
  for (const note of vault.notes) {
    commandRegistry.register({
      id: `note:open:${note.path}`,
      label: `Open: ${note.title}`,
      execute: () => tabs.open(note.path),
    })
  }
}

export function refreshNoteCommands() {
  // Remove old note:open commands
  const all = commandRegistry.getAll()
  for (const cmd of all) {
    if (cmd.id.startsWith('note:open:')) {
      commandRegistry.unregister(cmd.id)
    }
  }

  // Re-register
  for (const note of vault.notes) {
    commandRegistry.register({
      id: `note:open:${note.path}`,
      label: `Open: ${note.title}`,
      execute: () => tabs.open(note.path),
    })
  }
}
