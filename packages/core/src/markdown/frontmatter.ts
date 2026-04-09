import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export interface ParsedFrontmatter {
  data: Record<string, unknown>
  content: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) {
    return { data: {}, content: raw }
  }

  try {
    const yamlStr = match[1]
    const content = match[2]
    const data = parseYaml(yamlStr)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { data: {}, content: raw }
    }
    return { data: data as Record<string, unknown>, content }
  } catch {
    return { data: {}, content: raw }
  }
}

export function extractTags(frontmatter: Record<string, unknown>): string[] {
  const tags: string[] = []

  // Support both "tags" and "tag" keys
  for (const key of ['tags', 'tag']) {
    const val = frontmatter[key]
    if (Array.isArray(val)) {
      tags.push(...val.map(String))
    } else if (typeof val === 'string') {
      // Support comma-separated: "tag1, tag2"
      tags.push(
        ...val
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      )
    }
  }

  return [...new Set(tags)]
}

export function serializeFrontmatter(data: Record<string, unknown>, content: string): string {
  if (Object.keys(data).length === 0) return content
  const yaml = stringifyYaml(data).trim()
  return `---\n${yaml}\n---\n${content}`
}
