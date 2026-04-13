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
  import ConflictDialog from '$lib/components/ConflictDialog.svelte'
  import { activeEditor } from '$lib/state/editor.svelte.js'
  import { watcher } from '$lib/state/watcher.svelte.js'
  import { registerDefaultCommands, refreshNoteCommands } from '$lib/commands/defaults.js'

  let resizing = $state(false)
  let tabBar: ReturnType<typeof TabBar> | null = null
  let fileExplorer: ReturnType<typeof FileExplorer> | null = null
  let newVaultName = $state('')
  let newVaultPath = $state('')
  let showCreateForm = $state(false)

  onMount(async () => {
    await vault.init()
    if (vault.initialized) {
      onVaultReady()
    }
  })

  function onVaultReady() {
    registerDefaultCommands()
    watcher.connect()
    tabs.restore()
    if (tabs.tabs.length === 0 && vault.notes.length > 0) {
      tabs.open(vault.notes[0].path)
    }
    vault.service.events.on('note:created', refreshNoteCommands)
    vault.service.events.on('note:deleted', refreshNoteCommands)
    vault.service.events.on('note:renamed', refreshNoteCommands)
  }

  async function handleOpenVault(id: string) {
    await vault.openVault(id)
    onVaultReady()
  }

  async function handleCreateVault() {
    if (!newVaultName.trim() || !newVaultPath.trim()) return
    await vault.createVault(newVaultName.trim(), newVaultPath.trim())
    newVaultName = ''
    newVaultPath = ''
    showCreateForm = false
    onVaultReady()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!vault.initialized) return
    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key === 's') {
      e.preventDefault()
      activeEditor.saveNow?.()
    } else if (mod && e.key === 'n') {
      e.preventDefault()
      vault.createNote().then((meta) => tabs.open(meta.path))
    } else if (mod && e.key === 'w') {
      e.preventDefault()
      tabBar?.closeActiveTab()
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
    } else if (mod && e.shiftKey && e.key === 'E') {
      e.preventDefault()
      if (!ui.sidebarVisible) ui.toggleSidebar()
      fileExplorer?.focusExplorer()
    } else if (mod && e.key === 'e' && !e.shiftKey) {
      e.preventDefault()
      activeEditor.view?.focus()
    }
  }

  function startResize(e: MouseEvent) {
    e.preventDefault()
    resizing = true
    function onMouseMove(e: MouseEvent) { ui.setSidebarWidth(e.clientX) }
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

{#if vault.loading}
  <div class="loading">
    <p>Loading...</p>
  </div>
{:else if !vault.serverReachable}
  <div class="landing">
    <div class="landing-card">
      <h1 class="landing-logo">Vault</h1>
      <p class="landing-tagline">Cannot reach the backend server</p>
      <p class="landing-hint">Start the server with <code>pnpm dev</code> from the project root.</p>
    </div>
  </div>
{:else if !vault.initialized}
  <!-- Vault picker / management screen -->
  <div class="landing">
    <div class="landing-card">
      <h1 class="landing-logo">Vault</h1>
      <p class="landing-tagline">A markdown editor for connected notes</p>

      {#if vault.vaults.length > 0}
        <div class="vault-list">
          <h2 class="section-title">Your Vaults</h2>
          {#each vault.vaults as v (v.id)}
            <button class="vault-item" onclick={() => handleOpenVault(v.id)}>
              <span class="vault-name">{v.name}</span>
              <span class="vault-path">{v.path}</span>
            </button>
          {/each}
        </div>
      {/if}

      <div class="landing-actions">
        {#if showCreateForm}
          <div class="create-form">
            <h2 class="section-title">New Vault</h2>
            <input
              class="input"
              bind:value={newVaultName}
              placeholder="Vault name"
              onkeydown={(e) => { if (e.key === 'Enter') handleCreateVault() }}
            />
            <input
              class="input"
              bind:value={newVaultPath}
              placeholder="Folder path (e.g. ~/notes)"
              onkeydown={(e) => { if (e.key === 'Enter') handleCreateVault() }}
            />
            <div class="form-buttons">
              <button class="btn-primary" onclick={handleCreateVault}>Create</button>
              <button class="btn-secondary" onclick={() => (showCreateForm = false)}>Cancel</button>
            </div>
          </div>
        {:else}
          <button class="btn-primary" onclick={() => (showCreateForm = true)}>
            Create New Vault
          </button>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="app-shell" class:resizing>
    {#if ui.sidebarVisible}
      <aside class="sidebar" style="width: {ui.sidebarWidth}px">
        <div class="sidebar-header">
          <h1 class="logo">{vault.activeVault?.name ?? 'Vault'}</h1>
          <button class="new-note-btn" onclick={() => vault.createNote().then((m) => tabs.open(m.path))} title="New note (Ctrl+N)">
            +
          </button>
        </div>
        <div class="sidebar-content">
          <FileExplorer bind:this={fileExplorer} />
        </div>
      </aside>
      <div class="resize-handle" onmousedown={startResize}></div>
    {/if}

    <main class="main-area">
      <div class="tabbar-container">
        <TabBar bind:this={tabBar} />
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
    <ConflictDialog />
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

  .landing {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: var(--vault-bg-primary);
  }

  .landing-card {
    text-align: center;
    max-width: 440px;
    width: 100%;
    padding: 48px 32px;
  }

  .landing-logo {
    font-size: 36px;
    font-weight: 800;
    color: var(--vault-accent);
    margin: 0 0 8px;
    letter-spacing: 1px;
  }

  .landing-tagline {
    color: var(--vault-text-secondary);
    font-size: 15px;
    margin: 0 0 32px;
  }

  .landing-hint {
    color: var(--vault-text-muted);
    font-size: 13px;
    margin: 8px 0;
  }

  .landing-hint code {
    background: var(--vault-bg-tertiary);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vault-text-muted);
    margin: 0 0 8px;
  }

  .vault-list {
    margin-bottom: 24px;
    text-align: left;
  }

  .vault-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--vault-border);
    border-radius: 8px;
    background: var(--vault-bg-secondary);
    color: var(--vault-text-primary);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    margin-bottom: 6px;
    transition: all 0.15s;
  }

  .vault-item:hover {
    border-color: var(--vault-accent);
    background: var(--vault-bg-tertiary);
  }

  .vault-name {
    font-size: 14px;
    font-weight: 600;
  }

  .vault-path {
    font-size: 11px;
    color: var(--vault-text-muted);
  }

  .landing-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .create-form {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--vault-border);
    border-radius: 6px;
    background: var(--vault-bg-secondary);
    color: var(--vault-text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }

  .input:focus {
    border-color: var(--vault-accent);
  }

  .form-buttons {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .btn-primary {
    flex: 1;
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    background: var(--vault-accent);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }

  .btn-primary:hover {
    background: var(--vault-accent-hover);
  }

  .btn-secondary {
    flex: 1;
    padding: 10px 24px;
    border: 1px solid var(--vault-border);
    border-radius: 8px;
    background: transparent;
    color: var(--vault-text-secondary);
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }

  .btn-secondary:hover {
    border-color: var(--vault-text-muted);
    color: var(--vault-text-primary);
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    flex-shrink: 0;
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
