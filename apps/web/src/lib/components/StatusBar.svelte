<script lang="ts">
  import { tabs } from '$lib/state/tabs.svelte.js'
  import { vault } from '$lib/state/vault.svelte.js'
  import { ui } from '$lib/state/ui.svelte.js'

  let noteCount = $derived(vault.notes.length)
  let activeNote = $derived(tabs.activeTab)
</script>

<div class="statusbar">
  <span class="status-left">
    {#if activeNote}
      <span class="path">{activeNote.path}</span>
      {#if activeNote.dirty}
        <span class="saving">Saving...</span>
      {:else}
        <span class="saved">Saved</span>
      {/if}
    {/if}
  </span>
  <span class="status-right">
    <button class="theme-toggle" onclick={() => ui.toggleTheme()} title="Toggle theme">
      {ui.theme === 'dark' ? '☀' : '☾'}
    </button>
    <span class="note-count">{noteCount} notes</span>
  </span>
</div>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 12px;
    font-size: 11px;
    color: var(--vault-text-muted);
  }

  .status-left, .status-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .path {
    color: var(--vault-text-secondary);
  }

  .saving {
    color: var(--vault-accent);
  }

  .saved {
    opacity: 0.5;
  }

  .theme-toggle {
    border: none;
    background: transparent;
    color: var(--vault-text-muted);
    cursor: pointer;
    font-size: 13px;
    padding: 0 4px;
  }

  .theme-toggle:hover {
    color: var(--vault-text-primary);
  }
</style>
