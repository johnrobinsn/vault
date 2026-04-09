import { type CompletionContext, type CompletionResult, type Completion } from '@codemirror/autocomplete'
import { type Extension } from '@codemirror/state'
import { autocompletion } from '@codemirror/autocomplete'

export interface WikiLinkCompletionSource {
  /** Returns list of note paths/titles available for linking */
  getNotes(): { path: string; title: string }[]
}

function wikilinkCompletions(source: WikiLinkCompletionSource) {
  return (context: CompletionContext): CompletionResult | null => {
    // Look for [[ before the cursor
    const before = context.matchBefore(/\[\[[^\]]*/)
    if (!before) return null

    // The text after [[
    const query = before.text.slice(2).toLowerCase()
    const notes = source.getNotes()

    const options: Completion[] = notes
      .filter((n) => {
        if (!query) return true
        return (
          n.title.toLowerCase().includes(query) ||
          n.path.toLowerCase().includes(query)
        )
      })
      .slice(0, 50) // Limit for performance
      .map((n) => ({
        label: n.title,
        detail: n.path !== n.title + '.md' ? n.path : undefined,
        apply: (view, completion, from, to) => {
          // Replace from [[ to cursor with [[Title]]
          const insert = `[[${completion.label}]]`
          view.dispatch({
            changes: { from: before.from, to },
            selection: { anchor: before.from + insert.length },
          })
        },
      }))

    return {
      from: before.from,
      options,
      filter: false, // We already filtered
    }
  }
}

/**
 * CodeMirror extension that provides [[wiki-link]] autocomplete.
 */
export function wikilinkCompletion(source: WikiLinkCompletionSource): Extension {
  return autocompletion({
    override: [wikilinkCompletions(source)],
    activateOnTyping: true,
  })
}
