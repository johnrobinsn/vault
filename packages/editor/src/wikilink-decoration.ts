import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type ViewUpdate,
  WidgetType,
  type EditorView,
} from '@codemirror/view'
import { type Extension } from '@codemirror/state'

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

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
