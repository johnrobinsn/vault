export interface WikiLink {
  /** Full match text including brackets: [[target|display]] */
  raw: string
  /** The target note (before |) */
  target: string
  /** The display text (after |), or same as target if no alias */
  display: string
  /** Start index in the source string */
  start: number
  /** End index in the source string */
  end: number
}

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

/**
 * Extract all wiki-links from markdown content.
 */
export function extractWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = []
  let match: RegExpExecArray | null

  // Reset regex state
  WIKILINK_RE.lastIndex = 0

  while ((match = WIKILINK_RE.exec(content)) !== null) {
    const target = match[1].trim()
    const display = match[2]?.trim() ?? target
    links.push({
      raw: match[0],
      target,
      display,
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return links
}

/**
 * Get unique target note names from a set of wiki-links.
 */
export function uniqueLinkTargets(links: WikiLink[]): string[] {
  return [...new Set(links.map((l) => l.target))]
}

/**
 * Resolve a wiki-link target to a note path.
 * Obsidian resolves links by matching the shortest unique path.
 * For MVP, we match by filename (case-insensitive).
 */
export function resolveWikiLink(target: string, allPaths: string[]): string | null {
  const normalizedTarget = target.toLowerCase()

  // First try exact path match
  const exactMatch = allPaths.find((p) => p.toLowerCase() === normalizedTarget + '.md' || p.toLowerCase() === normalizedTarget)
  if (exactMatch) return exactMatch

  // Then try filename match (without extension)
  const filenameMatch = allPaths.find((p) => {
    const name = p.split('/').pop() ?? ''
    const stem = name.endsWith('.md') ? name.slice(0, -3) : name
    return stem.toLowerCase() === normalizedTarget
  })
  return filenameMatch ?? null
}

/**
 * Replace all wiki-link references to `oldName` with `newName` in content.
 */
export function replaceWikiLinkTarget(
  content: string,
  oldName: string,
  newName: string,
): string {
  const oldLower = oldName.toLowerCase()

  return content.replace(WIKILINK_RE, (match, target: string, display: string | undefined) => {
    if (target.trim().toLowerCase() === oldLower) {
      if (display) {
        return `[[${newName}|${display.trim()}]]`
      }
      return `[[${newName}]]`
    }
    return match
  })
}
