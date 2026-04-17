<script lang="ts">
  import { tabs } from '$lib/state/tabs.svelte.js'
  import { vault } from '$lib/state/vault.svelte.js'
  import { ui } from '$lib/state/ui.svelte.js'
  import { activeEditor } from '$lib/state/editor.svelte.js'

  let noteCount = $derived(vault.notes.length)
  let activeNote = $derived(tabs.activeTab)
</script>

<div class="statusbar">
  <span class="status-left">
    {#if activeNote}
      <span class="path">{activeNote.path}</span>
      {#if activeNote.dirty}
        <span class="unsaved">Unsaved</span>
      {:else}
        <span class="saved">Saved</span>
      {/if}
    {/if}
  </span>
  <span class="status-right">
    {#if activeNote}
      <span class="counts">{activeEditor.wordCount} words, {activeEditor.charCount} chars</span>
    {/if}
    <button class="theme-toggle" onclick={() => ui.toggleTheme()} title="Toggle theme">
      {ui.theme === 'dark' ? '☀' : '☾'}
    </button>
    <span class="note-count">{noteCount} notes</span>
    {#if vault.activeVault}
      <button class="vault-switch" onclick={() => vault.switchVault()} title="Switch vault">
        {vault.activeVault.name}
      </button>
    {/if}
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

  .unsaved {
    color: var(--vault-accent);
    font-weight: 600;
  }

  .saved {
    opacity: 0.5;
  }

  .counts {
    color: var(--vault-text-muted);
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

  .vault-switch {
    border: none;
    background: transparent;
    color: var(--vault-text-muted);
    cursor: pointer;
    font-size: 11px;
    padding: 0 4px;
    border-left: 1px solid var(--vault-border);
    padding-left: 8px;
    font-family: inherit;
  }

  .vault-switch:hover {
    color: var(--vault-text-primary);
  }
</style>
