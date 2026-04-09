<script lang="ts">
  import { SearchEngine, type SearchResult } from '@vault/core'
  import { vault } from '$lib/state/vault.svelte.js'
  import { tabs } from '$lib/state/tabs.svelte.js'
  import { ui } from '$lib/state/ui.svelte.js'

  let query = $state('')
  let results = $state<SearchResult[]>([])
  let searchTimeout: ReturnType<typeof setTimeout> | null = null
  let inputEl = $state<HTMLInputElement | null>(null)
  const engine = new SearchEngine()

  async function runSearch() {
    if (!query.trim()) {
      results = []
      return
    }

    // Build index from current vault state
    const notes = vault.notes
    const searchable = await Promise.all(
      notes.map(async (n) => ({
        path: n.path,
        title: n.title,
        content: (await vault.readNote(n.path)) ?? '',
      })),
    )
    engine.index(searchable)
    results = engine.search(query)
  }

  function handleInput() {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(runSearch, 300)
  }

  function handleResultClick(result: SearchResult) {
    tabs.open(result.path)
    ui.searchPanelOpen = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      ui.searchPanelOpen = false
    }
  }

  $effect(() => {
    if (ui.searchPanelOpen && inputEl) {
      inputEl.focus()
      inputEl.select()
    }
  })
</script>

{#if ui.searchPanelOpen}
  <div class="search-overlay" onclick={() => (ui.searchPanelOpen = false)} role="presentation">
    <div class="search-panel" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="search-input-container">
        <input
          bind:this={inputEl}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          class="search-input"
          placeholder="Search notes..."
          type="text"
        />
      </div>
      {#if results.length > 0}
        <div class="search-results">
          {#each results as result (result.path + result.lineNumber)}
            <button class="search-result" onclick={() => handleResultClick(result)}>
              <span class="result-title">{result.title}</span>
              <span class="result-path">{result.path}</span>
              {#if result.context}
                <span class="result-context">{result.context}</span>
              {/if}
            </button>
          {/each}
        </div>
      {:else if query.trim()}
        <div class="no-results">No results found</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .search-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
    display: flex;
    justify-content: center;
    padding-top: 80px;
  }

  .search-panel {
    width: 560px;
    max-height: 500px;
    background: var(--vault-bg-secondary);
    border: 1px solid var(--vault-border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-input-container {
    padding: 12px;
    border-bottom: 1px solid var(--vault-border);
  }

  .search-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--vault-border);
    border-radius: 6px;
    background: var(--vault-bg-primary);
    color: var(--vault-text-primary);
    font-size: 14px;
    outline: none;
    font-family: inherit;
  }

  .search-input:focus {
    border-color: var(--vault-accent);
  }

  .search-results {
    overflow-y: auto;
    padding: 4px;
  }

  .search-result {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: var(--vault-text-primary);
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    font-family: inherit;
  }

  .search-result:hover {
    background: var(--vault-bg-tertiary);
  }

  .result-title {
    font-size: 13px;
    font-weight: 500;
  }

  .result-path {
    font-size: 11px;
    color: var(--vault-text-muted);
  }

  .result-context {
    font-size: 12px;
    color: var(--vault-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-results {
    padding: 24px;
    text-align: center;
    color: var(--vault-text-muted);
    font-size: 13px;
  }
</style>
