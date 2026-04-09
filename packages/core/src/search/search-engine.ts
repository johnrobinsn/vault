import type { NoteMetadata } from '../storage/types.js'

export interface SearchResult {
  path: string
  title: string
  /** Matching line of content with surrounding context */
  context: string
  /** Line number of the match (1-based) */
  lineNumber: number
  /** Start index of match within the context string */
  matchStart: number
  /** Length of the match within the context string */
  matchLength: number
}

export interface SearchableNote {
  path: string
  title: string
  content: string
}

/**
 * Simple in-memory search engine.
 * Searches both filename and full-text content.
 * Can be replaced with FlexSearch later for better performance.
 */
export class SearchEngine {
  private notes: SearchableNote[] = []

  index(notes: SearchableNote[]) {
    this.notes = notes
  }

  addNote(note: SearchableNote) {
    this.removeNote(note.path)
    this.notes.push(note)
  }

  removeNote(path: string) {
    this.notes = this.notes.filter((n) => n.path !== path)
  }

  updateNote(note: SearchableNote) {
    this.addNote(note)
  }

  search(query: string, maxResults = 50): SearchResult[] {
    if (!query.trim()) return []

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    const results: SearchResult[] = []

    for (const note of this.notes) {
      if (results.length >= maxResults) break

      const titleLower = note.title.toLowerCase()
      const contentLower = note.content.toLowerCase()

      // Check if all terms match somewhere in title or content
      const allMatch = terms.every(
        (t) => titleLower.includes(t) || contentLower.includes(t),
      )
      if (!allMatch) continue

      // Find the first content match for context
      const lines = note.content.split('\n')
      let found = false

      for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase()
        for (const term of terms) {
          const idx = lineLower.indexOf(term)
          if (idx !== -1) {
            results.push({
              path: note.path,
              title: note.title,
              context: lines[i].trim(),
              lineNumber: i + 1,
              matchStart: idx,
              matchLength: term.length,
            })
            found = true
            break
          }
        }
        if (found) break
      }

      // If match was in title only, add with first line context
      if (!found) {
        results.push({
          path: note.path,
          title: note.title,
          context: lines[0]?.trim() ?? '',
          lineNumber: 1,
          matchStart: 0,
          matchLength: 0,
        })
      }
    }

    return results
  }
}
