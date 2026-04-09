<script lang="ts">
</script>

<div class="app-shell">
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1 class="logo">Vault</h1>
    </div>
    <div class="sidebar-content">
      <!-- FileExplorer will go here -->
      <p class="placeholder">File Explorer</p>
    </div>
  </aside>
  <main class="main-area">
    <div class="tabbar">
      <!-- TabBar will go here -->
    </div>
    <div class="editor-area">
      <p class="placeholder">Editor</p>
    </div>
    <div class="statusbar">
      <span class="status-text">Ready</span>
    </div>
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    width: 100vw;
  }

  .sidebar {
    width: var(--vault-sidebar-width);
    min-width: 180px;
    max-width: 500px;
    background: var(--vault-bg-secondary);
    border-right: 1px solid var(--vault-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--vault-border);
  }

  .logo {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: var(--vault-accent);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tabbar {
    height: var(--vault-tabbar-height);
    background: var(--vault-bg-secondary);
    border-bottom: 1px solid var(--vault-border);
    display: flex;
    align-items: center;
  }

  .editor-area {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }

  .statusbar {
    height: var(--vault-statusbar-height);
    background: var(--vault-bg-secondary);
    border-top: 1px solid var(--vault-border);
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 11px;
    color: var(--vault-text-muted);
  }

  .placeholder {
    color: var(--vault-text-muted);
    text-align: center;
    padding: 40px;
  }
</style>
