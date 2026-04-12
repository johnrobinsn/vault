import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type ViewUpdate,
  WidgetType,
  type EditorView,
} from '@codemirror/view'
import { type Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

/** Callback set by the editor factory for handling wiki-link clicks */
let onWikiLinkClick: ((target: string) => void) | null = null

/** Called by createEditor to register the click handler */
export function setWikiLinkClickHandler(handler: ((target: string) => void) | null) {
  onWikiLinkClick = handler
}

class WikiLinkWidget extends WidgetType {
  constructor(
    readonly display: string,
    readonly target: string,
  ) {
    super()
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-wikilink'
    span.textContent = this.display
    span.dataset.target = this.target
    span.title = this.target
    span.addEventListener('mousedown', (e) => {
      // mousedown instead of click — fires before CM6 moves the cursor
      e.preventDefault()
      e.stopPropagation()
      if (onWikiLinkClick) {
        onWikiLinkClick(this.target)
      }
    })
    return span
  }

  eq(other: WikiLinkWidget): boolean {
    return this.display === other.display && this.target === other.target
  }
}

/**
 * Decorates [[wiki-links]] in the editor:
 * - When cursor is NOT on the line: replaces entire [[target|display]] with a styled widget
 * - When cursor IS on the line: applies mark decoration for syntax highlighting
 */
export function wikilinkDecoration(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = this.build(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = this.build(update.view)
        }
      }

      build(view: EditorView): DecorationSet {
        const decorations: import('@codemirror/state').Range<Decoration>[] = []
        const { state } = view

        // Collect table ranges to skip (tables are handled by table plugin)
        const tableRanges: { from: number; to: number }[] = []
        syntaxTree(state).iterate({
          enter(node) {
            if (node.type.name === 'Table') {
              tableRanges.push({ from: node.from, to: node.to })
              return false
            }
          },
        })

        function isInsideTable(pos: number): boolean {
          return tableRanges.some((r) => pos >= r.from && pos <= r.to)
        }

        // Collect all cursor line numbers for multi-cursor support
        const cursorLines = new Set<number>()
        for (const range of state.selection.ranges) {
          cursorLines.add(state.doc.lineAt(range.head).number)
        }

        for (const { from, to } of view.visibleRanges) {
          const text = state.doc.sliceString(from, to)
          WIKILINK_RE.lastIndex = 0
          let match: RegExpExecArray | null

          while ((match = WIKILINK_RE.exec(text)) !== null) {
            const start = from + match.index
            const end = start + match[0].length
            if (isInsideTable(start)) continue
            const target = match[1].trim()
            const display = match[2]?.trim() ?? target
            const matchLine = state.doc.lineAt(start).number

            if (!cursorLines.has(matchLine)) {
              // Replace with widget when cursor is not on this line
              decorations.push(
                Decoration.replace({
                  widget: new WikiLinkWidget(display, target),
                }).range(start, end),
              )
            } else {
              // Just highlight the syntax when cursor is on this line
              decorations.push(
                Decoration.mark({ class: 'cm-wikilink-syntax' }).range(start, start + 2),
              )
              decorations.push(
                Decoration.mark({ class: 'cm-wikilink-target' }).range(
                  start + 2,
                  end - 2,
                ),
              )
              decorations.push(
                Decoration.mark({ class: 'cm-wikilink-syntax' }).range(end - 2, end),
              )
            }
          }
        }

        return Decoration.set(decorations, true)
      }
    },
    { decorations: (v) => v.decorations },
  )
}
