<script lang="ts">
  import { vault } from '$lib/state/vault.svelte.js'
  import { tabs } from '$lib/state/tabs.svelte.js'
  import { ui } from '$lib/state/ui.svelte.js'

  interface MatchRange {
    start: number
    length: number
  }

  interface SearchMatch {
    path: string
    title: string
    line: string
    lineNumber: number
    matchRanges: MatchRange[]
  }

  let query = $state('')
  let results = $state<SearchMatch[]>([])
  let total = $state(0)
  let searching = $state(false)
  let selectedIndex = $state(0)
  let searchTimeout: ReturnType<typeof setTimeout> | null = null
  let inputEl = $state<HTMLInputElement | null>(null)

  async function runSearch() {
    if (!query.trim()) {
      results = []
      total = 0
      searching = false
      return
    }

    searching = true
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&max=100`)
      const data = await res.json()
      results = data.results ?? []
      total = data.total ?? 0
    } catch {
      results = []
      total = 0
    }
    searching = false
    selectedIndex = 0
  }

  function handleInput() {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(runSearch, 200)
  }

  function handleResultClick(match: SearchMatch) {
    tabs.open(match.path)
    ui.searchPanelOpen = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      ui.searchPanelOpen = false
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1)
      scrollSelectedIntoView()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex = Math.max(selectedIndex - 1, 0)
      scrollSelectedIntoView()
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      handleResultClick(results[selectedIndex])
    }
  }

  function scrollSelectedIntoView() {
    const el = document.querySelector('.search-result.selected')
    el?.scrollIntoView({ block: 'nearest' })
  }

  /**
   * Render a line with match ranges highlighted.
   */
  function highlightLine(line: string, ranges: MatchRange[]): { text: string; highlight: boolean }[] {
    if (ranges.length === 0) return [{ text: line, highlight: false }]

    const parts: { text: string; highlight: boolean }[] = []
    let cursor = 0

    // Merge overlapping ranges and sort by start
    const sorted = [...ranges].sort((a, b) => a.start - b.start)
    const merged: MatchRange[] = []
    for (const r of sorted) {
      const last = merged[merged.length - 1]
      if (last && r.start <= last.start + last.length) {
        last.length = Math.max(last.length, r.start + r.length - last.start)
      } else {
        merged.push({ ...r })
      }
    }

    for (const range of merged) {
      if (range.start > cursor) {
        parts.push({ text: line.slice(cursor, range.start), highlight: false })
      }
      parts.push({
        text: line.slice(range.start, range.start + range.length),
        highlight: true,
      })
      cursor = range.start + range.length
    }

    if (cursor < line.length) {
      parts.push({ text: line.slice(cursor), highlight: false })
    }

    return parts
  }

  $effect(() => {
    if (ui.searchPanelOpen && inputEl) {
      inputEl.focus()
      inputEl.select()
    }
    if (!ui.searchPanelOpen) {
      query = ''
      results = []
      total = 0
    }
  })
</script>

{#if ui.searchPanelOpen}
  <div class="search-overlay" onclick={() => (ui.searchPanelOpen = false)} role="presentation">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="search-panel" onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown}>
      <div class="search-header">
        <input
          bind:this={inputEl}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          class="search-input"
          placeholder="Search in all notes..."
          type="text"
        />
        {#if query.trim()}
          <span class="match-count">
            {#if searching}
              ...
            {:else}
              {total} match{total !== 1 ? 'es' : ''}
            {/if}
          </span>
        {/if}
      </div>

      {#if results.length > 0}
        <div class="search-results">
          {#each results as match, i (match.path + ':' + match.lineNumber)}
            <button
              class="search-result"
              class:selected={i === selectedIndex}
              onclick={() => handleResultClick(match)}
              onmouseenter={() => (selectedIndex = i)}
            >
              <div class="result-header">
                <span class="result-title">{match.title}</span>
                <span class="result-location">:{match.lineNumber}</span>
              </div>
              {#if match.path !== match.title + '.md'}
                <span class="result-path">{match.path}</span>
              {/if}
              <span class="result-context">
                {#each highlightLine(match.line, match.matchRanges) as part}
                  {#if part.highlight}
                    <mark class="match-highlight">{part.text}</mark>
                  {:else}
                    {part.text}
                  {/if}
                {/each}
              </span>
            </button>
          {/each}
        </div>
      {:else if query.trim() && !searching}
        <div class="no-results">No matches found</div>
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
    width: 600px;
    max-height: 520px;
    background: var(--vault-bg-secondary);
    border: 1px solid var(--vault-border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--vault-border);
  }

  .search-input {
    flex: 1;
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

  .match-count {
    font-size: 12px;
    color: var(--vault-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
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

  .search-result:hover,
  .search-result.selected {
    background: var(--vault-bg-tertiary);
  }

  .result-header {
    display: flex;
    align-items: baseline;
    gap: 2px;
  }

  .result-title {
    font-size: 13px;
    font-weight: 600;
  }

  .result-location {
    font-size: 11px;
    color: var(--vault-text-muted);
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
    line-height: 1.4;
  }

  :global(.match-highlight) {
    background: rgba(124, 92, 191, 0.3);
    color: var(--vault-text-primary);
    border-radius: 2px;
    padding: 0 1px;
  }

  .no-results {
    padding: 24px;
    text-align: center;
    color: var(--vault-text-muted);
    font-size: 13px;
  }
</style>
