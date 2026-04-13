# Vault

A web-based markdown editor for connected notes, inspired by [Obsidian](https://obsidian.md).

Notes are stored as plain `.md` files on your local filesystem — fully compatible with Obsidian, VS Code, or any other markdown tool. Vault provides a live-preview editor with wiki-links, visual table editing, full-text search, and a command palette.

## Installation

### Prerequisites

- **Node.js 22+** — [Download](https://nodejs.org/) (LTS recommended)
- **pnpm** — Install with `npm install -g pnpm` (or see [pnpm.io](https://pnpm.io/installation))

### Linux / macOS

```bash
git clone https://github.com/johnrobinsn/vault.git
cd vault
pnpm install
pnpm dev
```

### Windows

```powershell
git clone https://github.com/johnrobinsn/vault.git
cd vault
pnpm install
pnpm dev
```

> **Note:** On Windows, if you see errors about `tsx` or `node`, make sure Node.js is in your PATH. If using PowerShell and `pnpm` isn't found, try `npx pnpm install` first.

### What `pnpm dev` does

Starts three processes in parallel via Turborepo:

1. **Backend server** on `http://localhost:3001` — serves the REST API and file watcher
2. **Frontend dev server** on `http://localhost:5175` — serves the web UI with hot reload
3. **TypeScript watchers** for the `core` and `editor` packages — auto-rebuilds on changes

Open **http://localhost:5175** in your browser. On first launch you'll see a vault picker — create a new vault by giving it a name and a folder path (e.g., `~/notes` on Linux/macOS or `C:\Users\YourName\notes` on Windows).

### Production build

```bash
pnpm build
```

Then start the server:

```bash
cd apps/server
node dist/index.js
```

And serve `apps/web/build/` with any static file server.

## Features

- **Live preview editor** — Markdown syntax hides as you type, showing rendered headings, bold, italic, code, links, and more. Move your cursor back to reveal the raw syntax. Powered by CodeMirror 6.
- **Wiki-links** — Type `[[` to link notes with autocomplete. Click rendered links to navigate. Supports `[[target|display text]]` aliases.
- **Visual table editing** — GFM tables render as interactive HTML tables. Click cells to edit, Tab between them, right-click for row/column operations.
- **File explorer** — Sidebar with folder tree, drag-and-drop, right-click context menu, double-click to rename. Full keyboard navigation.
- **Tabs** — Open multiple notes, reorder tabs. Unsaved changes show a dirty indicator.
- **Full-text search** — Server-side search across all notes (`Ctrl+Shift+F`) with highlighted matches.
- **Command palette** — Quick access to all commands (`Ctrl+P`), doubles as a note switcher.
- **Todo checkboxes** — `- [ ]` and `- [x]` render as clickable checkboxes.
- **Dark & light themes** — Follows system preference, toggle anytime.
- **File watching** — External changes (e.g., editing a file in VS Code) auto-refresh in Vault. Conflicts with unsaved edits are detected with a resolution dialog.
- **Vault management** — Create, open, and switch between multiple vaults from the landing screen.
- **LAN access** — Servers bind to `0.0.0.0` so you can access Vault from other machines on your network.
- **Plain files** — Notes are standard `.md` files on disk. No database, no lock-in.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Svelte 5 + SvelteKit |
| Editor | CodeMirror 6 with custom live-preview extensions |
| Backend | Hono (Node.js) |
| Storage | Local filesystem (plain `.md` files) |
| Styling | Tailwind CSS 4 + CSS custom properties |
| Build | Vite, pnpm workspaces, Turborepo |
| Testing | Vitest |

## Architecture

```
packages/core/      @vault/core       Pure TypeScript — storage interface,
                                      vault service, markdown parsing,
                                      search, wiki-links, event bus.

packages/editor/    @vault/editor     CodeMirror 6 extensions — live preview,
                                      table editor, wiki-link decorations,
                                      autocomplete, checkboxes, theme.

apps/web/           @vault/web        SvelteKit frontend — file explorer,
                                      tabs, search panel, command palette.

apps/server/        @vault/server     Hono backend — REST API, file watcher,
                                      WebSocket for live updates, vault config.
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current note |
| `Ctrl+N` | New note |
| `Ctrl+W` | Close tab (prompts if unsaved) |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+P` | Command palette / quick switcher |
| `Ctrl+Shift+F` | Search notes |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+E` | Focus file explorer |
| `Ctrl+E` | Focus editor |
| `[[` | Wiki-link autocomplete |

### File Explorer

| Key | Action |
|-----|--------|
| `Arrow Up/Down` | Navigate items |
| `Arrow Right` | Expand folder / enter children |
| `Arrow Left` | Collapse folder / go to parent |
| `Enter` | Open file / toggle folder |
| `F2` | Rename |
| `Delete` | Delete |
| `Home/End` | First / last item |
| `Escape` | Return focus to editor |

## Configuration

Vault stores its configuration in `~/.vault/config.json` (or `%USERPROFILE%\.vault\config.json` on Windows). This file tracks your configured vaults:

```json
{
  "vaults": [
    { "id": "notes", "name": "My Notes", "path": "/home/user/notes" }
  ],
  "activeVault": "notes"
}
```

## Roadmap

- [x] Core editor with live preview, wiki-links, search, command palette
- [x] Backend server with REST API and filesystem storage
- [x] Visual table editing
- [x] File watching with conflict resolution
- [x] Full keyboard navigation
- [ ] Backlinks panel and graph view
- [ ] Embeddable editor component
- [ ] CRDT-based sync for collaborative editing
- [ ] Electron desktop wrapper
- [ ] Android app wrapper

## License

MIT
