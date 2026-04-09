# Vault

A web-based markdown editor for connected notes, inspired by [Obsidian](https://obsidian.md).

Vault runs entirely in your browser — notes are stored locally in IndexedDB with no server required. Write in markdown, link notes with `[[wiki-links]]`, and navigate your knowledge graph.

## Features

- **Live preview editor** — Markdown syntax hides as you type, showing rendered headings, bold, italic, code, links, and more. Move your cursor back to reveal the raw syntax. Powered by CodeMirror 6.
- **Wiki-links** — Type `[[` to link notes with autocomplete. Click rendered links to navigate. Supports `[[target|display text]]` aliases.
- **File explorer** — Sidebar with folder tree, drag-and-drop, right-click context menu for create/rename/delete.
- **Tabs** — Open multiple notes, reorder tabs, keyboard navigation with `Ctrl+Tab`.
- **Search** — Full-text search across all notes (`Ctrl+Shift+F`).
- **Command palette** — Quick access to all commands (`Ctrl+P`), doubles as a note switcher.
- **Dark & light themes** — Follows system preference, toggle anytime. Persisted across sessions.
- **Vault import/export** — Export your entire vault as a `.zip` of `.md` files, or import one.
- **Local-first** — All data stays in your browser. No accounts, no server, no tracking.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Svelte 5 + SvelteKit |
| Editor | CodeMirror 6 with custom live-preview extensions |
| Storage | IndexedDB (via `idb`) |
| Styling | Tailwind CSS 4 + CSS custom properties |
| Build | Vite, pnpm workspaces, Turborepo |
| Testing | Vitest |

## Architecture

Vault is a pnpm monorepo with three packages:

```
packages/core/      @vault/core     Pure TypeScript — storage, vault service,
                                    markdown parsing, search, event bus.
                                    Zero DOM/framework dependencies.

packages/editor/    @vault/editor   CodeMirror 6 extensions — live preview,
                                    wiki-link decorations, autocomplete, theme.
                                    Zero Svelte dependencies.

apps/web/           @vault/web      SvelteKit app that wires everything together.
```

This separation means the editor can be extracted as an embeddable component, and the core logic can be consumed by CLI tools or AI agents — both planned for future milestones.

## Getting Started

```bash
# Clone
git clone https://github.com/johnrobinsn/vault.git
cd vault

# Install
pnpm install

# Build packages + start dev server
pnpm dev

# Or build everything for production
pnpm build
```

The app runs at [http://localhost:5175](http://localhost:5175).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+W` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+P` | Command palette / quick switcher |
| `Ctrl+Shift+F` | Search notes |
| `Ctrl+B` | Toggle sidebar |
| `[[` | Wiki-link autocomplete |

## Roadmap

- [x] **M1: Core editor & local vault** — Live preview, wiki-links, file explorer, tabs, search, command palette, themes, import/export
- [ ] **M2: Linking & discovery** — Backlinks panel, graph view, tags, outline view
- [ ] **M3: Embeddable component** — Extract editor as a standalone web component / npm package
- [ ] **M4: Sync & offline** — CRDT-based sync (Yjs), relay node, conflict resolution
- [ ] **M5: AI & collaboration** — Claude Code vault access API, collaborative cursors

## License

MIT
