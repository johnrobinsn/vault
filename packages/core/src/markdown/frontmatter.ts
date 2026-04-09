import matter from 'gray-matter'

export interface ParsedFrontmatter {
  data: Record<string, unknown>
  content: string
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  try {
    const { data, content } = matter(raw)
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
      tags.push(...val.split(',').map((t) => t.trim()).filter(Boolean))
    }
  }

  return [...new Set(tags)]
}

export function serializeFrontmatter(data: Record<string, unknown>, content: string): string {
  if (Object.keys(data).length === 0) return content
  return matter.stringify(content, data)
}
