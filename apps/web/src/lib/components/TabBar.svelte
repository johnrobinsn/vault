<script lang="ts">
  import { tabs, type Tab } from '$lib/state/tabs.svelte.js'
  import { activeEditor } from '$lib/state/editor.svelte.js'

  function handleClose(e: MouseEvent, tab: Tab) {
    e.stopPropagation()
    tryClose(tab)
  }

  function tryClose(tab: Tab) {
    if (tab.dirty) {
      // If closing the active tab, offer to save
      const choice = confirm(`"${tab.title}" has unsaved changes.\n\nPress OK to save and close, or Cancel to keep editing.`)
      if (!choice) return
      // Save then close
      if (tab.id === tabs.activeId) {
        activeEditor.saveNow?.()
      }
    }
    tabs.close(tab.id)
  }

  /** Exported for use by keyboard shortcut handler */
  export function closeActiveTab() {
    if (tabs.activeTab) {
      tryClose(tabs.activeTab)
    }
  }

  function handleClick(tab: Tab) {
    tabs.activate(tab.id)
  }

  function handleMiddleClick(e: MouseEvent, tab: Tab) {
    if (e.button === 1) {
      e.preventDefault()
      tryClose(tab)
    }
  }
</script>

<div class="tabbar">
  {#each tabs.tabs as tab (tab.id)}
    <div
      class="tab"
      class:active={tab.id === tabs.activeId}
      role="tab"
      tabindex="0"
      aria-selected={tab.id === tabs.activeId}
      onclick={() => handleClick(tab)}
      onauxclick={(e) => handleMiddleClick(e, tab)}
      onkeydown={(e) => { if (e.key === 'Enter') handleClick(tab) }}
    >
      <span class="tab-title" class:is-dirty={tab.dirty}>
        {tab.title}
      </span>
      <button class="tab-close" onclick={(e) => handleClose(e, tab)} title="Close">
        &times;
      </button>
    </div>
  {/each}
</div>

<style>
  .tabbar {
    display: flex;
    align-items: stretch;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    gap: 0;
    padding: 0 4px;
  }

  .tabbar::-webkit-scrollbar {
    height: 2px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    border: none;
    background: transparent;
    color: var(--vault-text-secondary);
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    transition: all 0.1s;
    font-family: inherit;
  }

  .tab:hover {
    color: var(--vault-text-primary);
    background: var(--vault-bg-tertiary);
  }

  .tab.active {
    color: var(--vault-text-primary);
    border-bottom-color: var(--vault-accent);
  }

  .tab-title {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tab-title.is-dirty {
    font-style: italic;
  }

  .tab-title.is-dirty::before {
    content: '';
    display: inline-block;
    width: 7px;
    height: 7px;
    background: var(--vault-accent);
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    background: transparent;
    color: var(--vault-text-muted);
    cursor: pointer;
    border-radius: 3px;
    font-size: 14px;
    padding: 0;
    font-family: inherit;
  }

  .tab-close:hover {
    background: var(--vault-bg-primary);
    color: var(--vault-text-primary);
  }
</style>
