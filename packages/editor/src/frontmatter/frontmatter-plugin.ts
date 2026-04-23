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

// Match frontmatter: opening ---, any content, closing ---
// The closing --- can be at EOF without a trailing newline
const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?\n)---[ \t]*(?:\r?\n|$)/

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

      // Place widget on the first line (same pattern as table widgets:
      // inline widget inside first hidden line, CSS override makes it visible)
      const widget = new FrontmatterWidget(yamlContent, 0, fmEnd, view)
      decs.push(
        Decoration.widget({ widget, side: -1 }).range(0),
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

/**
 * Auto-complete frontmatter: when the user types `---` on line 1
 * (followed by Enter or just finishes the three dashes), automatically
 * insert the closing `---` so the frontmatter widget appears immediately.
 */
const frontmatterAutoComplete = EditorView.updateListener.of((update) => {
  if (!update.docChanged) return

  const { state } = update
  const doc = state.doc
  if (doc.length === 0) return

  const line1 = doc.line(1)
  // Check if line 1 is exactly --- (just completed)
  if (line1.text.trim() !== '---') return

  // Check if there's already a closing --- somewhere in the doc
  const head = doc.sliceString(0, Math.min(doc.length, 2000))
  if (/^---[ \t]*\r?\n[\s\S]*?\n---/.test(head)) return

  // Check that this is a fresh change — i.e., the user just typed the
  // third dash or just created the line. We want to trigger ONCE,
  // not on every subsequent edit.
  let justTypedDashes = false
  for (const tr of update.transactions) {
    if (tr.docChanged) {
      tr.changes.iterChanges((fromA, _toA, fromB, toB, inserted) => {
        // If the change was inside line 1 and produced ---
        if (fromB <= line1.to && toB >= line1.from) {
          const insertedText = inserted.toString()
          if (insertedText.includes('-') || insertedText.includes('\n')) {
            justTypedDashes = true
          }
        }
      })
    }
  }
  if (!justTypedDashes) return

  // Auto-insert `\n\n---` after the first line
  const insertPos = line1.to
  const insert = '\n\n---'
  // Schedule on next tick to avoid nested dispatch
  setTimeout(() => {
    // Re-check state after the tick
    const d = update.view.state.doc
    if (d.line(1).text.trim() !== '---') return
    if (/^---[ \t]*\r?\n[\s\S]*?\n---/.test(d.sliceString(0, Math.min(d.length, 2000)))) return

    update.view.dispatch({
      changes: { from: insertPos, insert },
      // Place cursor on the empty line between the delimiters
      selection: { anchor: insertPos + 1 },
    })
  }, 0)
})

export function frontmatterEditor(): Extension {
  return [frontmatterPlugin, frontmatterAutoComplete]
}
