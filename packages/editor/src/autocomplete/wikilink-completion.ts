import {
  type CompletionContext,
  type CompletionResult,
  type Completion,
  autocompletion,
} from '@codemirror/autocomplete'
import { type Extension } from '@codemirror/state'

export interface WikiLinkCompletionSource {
  /** Returns list of note paths/titles available for linking */
  getNotes(): { path: string; title: string }[]
}

function wikilinkCompletions(source: WikiLinkCompletionSource) {
  return (context: CompletionContext): CompletionResult | null => {
    // Look for [[ before the cursor
    const before = context.matchBefore(/\[\[[^\]]*/)
    if (!before) return null

    const query = before.text.slice(2).toLowerCase()
    const notes = source.getNotes()

    const options: Completion[] = notes
      .filter((n) => {
        if (!query) return true
        return n.title.toLowerCase().includes(query) || n.path.toLowerCase().includes(query)
      })
      .slice(0, 50)
      .map((n) => ({
        label: n.title,
        detail: n.path !== n.title + '.md' ? n.path : undefined,
        // String apply: CM6 replaces from..cursor with this text
        apply: n.title + ']]',
      }))

    // from = after the [[, so CM6 replaces the query text with "Title]]"
    // resulting in "[[Title]]"
    return {
      from: before.from + 2,
      options,
      filter: false,
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
