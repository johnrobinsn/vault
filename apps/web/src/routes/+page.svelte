<script lang="ts">
  import { onMount } from 'svelte'
  import { vault } from '$lib/state/vault.svelte.js'
  import { tabs } from '$lib/state/tabs.svelte.js'
  import { ui } from '$lib/state/ui.svelte.js'
  import FileExplorer from '$lib/components/FileExplorer.svelte'
  import TabBar from '$lib/components/TabBar.svelte'
  import EditorPane from '$lib/components/EditorPane.svelte'
  import StatusBar from '$lib/components/StatusBar.svelte'
  import SearchPanel from '$lib/components/SearchPanel.svelte'
  import CommandPalette from '$lib/components/CommandPalette.svelte'
  import { registerDefaultCommands, refreshNoteCommands } from '$lib/commands/defaults.js'

  let resizing = $state(false)

  onMount(async () => {
    await vault.init()
    registerDefaultCommands()
    tabs.restore()

    // Open welcome note if no tabs
    if (tabs.tabs.length === 0 && vault.notes.length > 0) {
      tabs.open(vault.notes[0].path)
    }

    // Refresh note commands when vault changes
    vault.service.events.on('note:created', refreshNoteCommands)
    vault.service.events.on('note:deleted', refreshNoteCommands)
    vault.service.events.on('note:renamed', refreshNoteCommands)
  })

  function handleKeydown(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key === 'n') {
      e.preventDefault()
      vault.createNote().then((meta) => tabs.open(meta.path))
    } else if (mod && e.key === 'w') {
      e.preventDefault()
      if (tabs.activeTab) tabs.close(tabs.activeTab.id)
    } else if (mod && e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        tabs.activatePrev()
      } else {
        tabs.activateNext()
      }
    } else if (mod && e.key === 'p') {
      e.preventDefault()
      ui.toggleCommandPalette()
    } else if (mod && e.shiftKey && e.key === 'F') {
      e.preventDefault()
      ui.toggleSearchPanel()
    } else if (mod && e.key === 'b') {
      e.preventDefault()
      ui.toggleSidebar()
    }
  }

  function startResize(e: MouseEvent) {
    e.preventDefault()
    resizing = true

    function onMouseMove(e: MouseEvent) {
      ui.setSidebarWidth(e.clientX)
    }

    function onMouseUp() {
      resizing = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !vault.initialized}
  <div class="loading">
    <p>Loading vault...</p>
  </div>
{:else}
  <div class="app-shell" class:resizing>
    {#if ui.sidebarVisible}
      <aside class="sidebar" style="width: {ui.sidebarWidth}px">
        <div class="sidebar-header">
          <h1 class="logo">Vault</h1>
          <button class="new-note-btn" onclick={() => vault.createNote().then((m) => tabs.open(m.path))} title="New note (Ctrl+N)">
            +
          </button>
        </div>
        <div class="sidebar-content">
          <FileExplorer />
        </div>
      </aside>
      <div class="resize-handle" onmousedown={startResize}></div>
    {/if}

    <main class="main-area">
      <div class="tabbar-container">
        <TabBar />
      </div>
      <div class="editor-area">
        {#if tabs.activeTab}
          {#key tabs.activeTab.path}
            <EditorPane path={tabs.activeTab.path} />
          {/key}
        {:else}
          <div class="empty-state">
            <p>No note open</p>
            <p class="hint">Press <kbd>Ctrl+N</kbd> to create a new note</p>
          </div>
        {/if}
      </div>
      <div class="statusbar-container">
        <StatusBar />
      </div>
    </main>

    <SearchPanel />
    <CommandPalette />
  </div>
{/if}

<style>
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: var(--vault-text-muted);
  }

  .app-shell {
    display: flex;
    height: 100vh;
    width: 100vw;
  }

  .app-shell.resizing {
    cursor: col-resize;
    user-select: none;
  }

  .sidebar {
    min-width: 180px;
    max-width: 500px;
    background: var(--vault-bg-secondary);
    border-right: 1px solid var(--vault-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--vault-border);
  }

  .logo {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
    color: var(--vault-accent);
    letter-spacing: 0.5px;
  }

  .new-note-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--vault-text-secondary);
    font-size: 18px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .new-note-btn:hover {
    background: var(--vault-bg-tertiary);
    color: var(--vault-text-primary);
  }

  .sidebar-content {
    flex: 1;
    overflow: hidden;
  }

  .resize-handle {
    width: 4px;
    cursor: col-resize;
    background: transparent;
    flex-shrink: 0;
  }

  .resize-handle:hover {
    background: var(--vault-accent);
    opacity: 0.3;
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .tabbar-container {
    height: var(--vault-tabbar-height);
    background: var(--vault-bg-secondary);
    border-bottom: 1px solid var(--vault-border);
  }

  .editor-area {
    flex: 1;
    overflow: hidden;
  }

  .statusbar-container {
    height: var(--vault-statusbar-height);
    background: var(--vault-bg-secondary);
    border-top: 1px solid var(--vault-border);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--vault-text-muted);
  }

  .empty-state p {
    margin: 4px;
  }

  .hint {
    font-size: 13px;
  }

  kbd {
    background: var(--vault-bg-tertiary);
    border: 1px solid var(--vault-border);
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 12px;
    font-family: inherit;
  }
</style>
