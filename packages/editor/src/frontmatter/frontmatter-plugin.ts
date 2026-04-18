import { type Extension, type Range, StateEffect } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import { FrontmatterWidget } from './frontmatter-widget.js'

/** Effect to toggle between visual and source mode for frontmatter */
export const toggleFrontmatterSource = StateEffect.define<boolean>()

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

/**
 * ViewPlugin that detects YAML frontmatter at the top of the document
 * and renders a visual property editor widget.
 */
const frontmatterPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    private sourceMode = false

    constructor(view: EditorView) {
      this.decorations = this.build(view)
    }

    update(update: ViewUpdate) {
      for (const tr of update.transactions) {
        for (const effect of tr.effects) {
          if (effect.is(toggleFrontmatterSource)) {
            this.sourceMode = effect.value
          }
        }
      }

      if (update.docChanged || update.startState !== update.state) {
        this.decorations = this.build(update.view)
      }
    }

    build(view: EditorView): DecorationSet {
      if (this.sourceMode) return Decoration.none

      const decs: Range<Decoration>[] = []
      const { state } = view

      // Only check the first ~2000 chars for frontmatter
      const head = state.doc.sliceString(0, Math.min(state.doc.length, 2000))
      const match = head.match(FRONTMATTER_RE)
      if (!match) return Decoration.none

      const fmEnd = match[0].length
      const yamlContent = match[1]

      // Place widget as a block element before the first line
      // (block: true renders between lines, not inside a hidden line)
      const widget = new FrontmatterWidget(yamlContent, 0, fmEnd, view)
      decs.push(
        Decoration.widget({ widget, block: true, side: -1 }).range(0),
      )

      // Hide the frontmatter lines
      for (let pos = 0; pos < fmEnd && pos < state.doc.length; ) {
        const line = state.doc.lineAt(pos)
        decs.push(Decoration.line({ class: 'cm-frontmatter-hidden' }).range(line.from))
        pos = line.to + 1
      }

      return Decoration.set(decs.sort((a, b) => a.from - b.from), true)
    }
  },
  { decorations: (v) => v.decorations },
)

export function frontmatterEditor(): Extension {
  return [frontmatterPlugin]
}
