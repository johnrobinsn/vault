<script lang="ts">
  import { commandRegistry, type Command } from '$lib/commands/registry.js'
  import { ui } from '$lib/state/ui.svelte.js'

  let query = $state('')
  let results = $state<Command[]>([])
  let selectedIndex = $state(0)
  let inputEl = $state<HTMLInputElement | null>(null)

  function updateResults() {
    results = commandRegistry.search(query)
    selectedIndex = 0
  }

  function executeSelected() {
    if (results[selectedIndex]) {
      const cmd = results[selectedIndex]
      ui.commandPaletteOpen = false
      query = ''
      // Execute after closing to avoid event conflicts
      setTimeout(() => cmd.execute(), 0)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      ui.commandPaletteOpen = false
      query = ''
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex = Math.max(selectedIndex - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      executeSelected()
    }
  }

  $effect(() => {
    if (ui.commandPaletteOpen) {
      updateResults()
      // Focus input after render
      setTimeout(() => inputEl?.focus(), 0)
    } else {
      query = ''
    }
  })
</script>

{#if ui.commandPaletteOpen}
  <div class="palette-overlay" onclick={() => (ui.commandPaletteOpen = false)} role="presentation">
    <div class="palette" onclick={(e) => e.stopPropagation()} role="dialog">
      <input
        bind:this={inputEl}
        bind:value={query}
        oninput={updateResults}
        onkeydown={handleKeydown}
        class="palette-input"
        placeholder="Type a command..."
        type="text"
      />
      {#if results.length > 0}
        <div class="palette-results">
          {#each results as cmd, i (cmd.id)}
            <button
              class="palette-item"
              class:selected={i === selectedIndex}
              onclick={() => { selectedIndex = i; executeSelected() }}
              onmouseenter={() => (selectedIndex = i)}
            >
              <span class="item-label">{cmd.label}</span>
              {#if cmd.shortcut}
                <span class="item-shortcut">{cmd.shortcut}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .palette-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 200;
    display: flex;
    justify-content: center;
    padding-top: 60px;
  }

  .palette {
    width: 500px;
    max-height: 400px;
    background: var(--vault-bg-secondary);
    border: 1px solid var(--vault-border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .palette-input {
    padding: 12px 16px;
    border: none;
    border-bottom: 1px solid var(--vault-border);
    background: transparent;
    color: var(--vault-text-primary);
    font-size: 15px;
    outline: none;
    font-family: inherit;
  }

  .palette-results {
    overflow-y: auto;
    padding: 4px;
  }

  .palette-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: var(--vault-text-primary);
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    text-align: left;
    font-family: inherit;
  }

  .palette-item:hover,
  .palette-item.selected {
    background: var(--vault-bg-tertiary);
  }

  .item-shortcut {
    font-size: 11px;
    color: var(--vault-text-muted);
    background: var(--vault-bg-primary);
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--vault-border);
  }
</style>
