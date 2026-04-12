<script lang="ts">
  import { watcher } from '$lib/state/watcher.svelte.js'
</script>

{#if watcher.conflict}
  <div class="conflict-overlay" role="dialog">
    <div class="conflict-dialog">
      <h2 class="conflict-title">File Changed on Disk</h2>
      <p class="conflict-msg">
        <strong>{watcher.conflict.path}</strong> was modified outside the editor while you have unsaved changes.
      </p>
      <div class="conflict-actions">
        <button class="btn conflict-keep" onclick={() => watcher.resolveKeepEditor()}>
          Keep My Changes
        </button>
        <button class="btn conflict-load" onclick={() => watcher.resolveLoadDisk()}>
          Load Disk Version
        </button>
        <button class="btn conflict-saveas" onclick={() => watcher.resolveSaveAs()}>
          Save Mine As Copy
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .conflict-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .conflict-dialog {
    background: var(--vault-bg-secondary);
    border: 1px solid var(--vault-border);
    border-radius: 10px;
    padding: 24px 28px;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }

  .conflict-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 8px;
    color: #e8a838;
  }

  .conflict-msg {
    font-size: 13px;
    color: var(--vault-text-secondary);
    margin: 0 0 20px;
    line-height: 1.5;
  }

  .conflict-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn {
    padding: 10px 16px;
    border: 1px solid var(--vault-border);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: all 0.1s;
  }

  .conflict-keep {
    background: var(--vault-accent);
    color: #fff;
    border-color: var(--vault-accent);
  }

  .conflict-keep:hover {
    background: var(--vault-accent-hover);
  }

  .conflict-load {
    background: transparent;
    color: var(--vault-text-primary);
  }

  .conflict-load:hover {
    background: var(--vault-bg-tertiary);
  }

  .conflict-saveas {
    background: transparent;
    color: var(--vault-text-secondary);
  }

  .conflict-saveas:hover {
    background: var(--vault-bg-tertiary);
    color: var(--vault-text-primary);
  }
</style>
