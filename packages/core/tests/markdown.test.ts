import { describe, it, expect } from 'vitest'
import {
  extractWikiLinks,
  uniqueLinkTargets,
  resolveWikiLink,
  replaceWikiLinkTarget,
} from '../src/markdown/wikilinks.js'
import { parseFrontmatter, extractTags, serializeFrontmatter } from '../src/markdown/frontmatter.js'

describe('wikilinks', () => {
  describe('extractWikiLinks', () => {
    it('extracts simple links', () => {
      const links = extractWikiLinks('See [[Daily Notes]] for info.')
      expect(links).toHaveLength(1)
      expect(links[0].target).toBe('Daily Notes')
      expect(links[0].display).toBe('Daily Notes')
      expect(links[0].start).toBe(4)
      expect(links[0].end).toBe(19)
    })

    it('extracts aliased links', () => {
      const links = extractWikiLinks('See [[Daily Notes|my notes]] here.')
      expect(links).toHaveLength(1)
      expect(links[0].target).toBe('Daily Notes')
      expect(links[0].display).toBe('my notes')
    })

    it('extracts multiple links', () => {
      const links = extractWikiLinks('[[A]] and [[B]] and [[C|see C]]')
      expect(links).toHaveLength(3)
      expect(links.map((l) => l.target)).toEqual(['A', 'B', 'C'])
    })

    it('handles empty content', () => {
      expect(extractWikiLinks('')).toHaveLength(0)
    })

    it('ignores incomplete brackets', () => {
      expect(extractWikiLinks('[[incomplete')).toHaveLength(0)
      expect(extractWikiLinks('incomplete]]')).toHaveLength(0)
      expect(extractWikiLinks('[single]')).toHaveLength(0)
    })

    it('trims whitespace in targets', () => {
      const links = extractWikiLinks('[[ Spaced Target ]]')
      expect(links[0].target).toBe('Spaced Target')
    })
  })

  describe('uniqueLinkTargets', () => {
    it('deduplicates targets', () => {
      const links = extractWikiLinks('[[A]] and [[B]] and [[A|alias]]')
      expect(uniqueLinkTargets(links)).toEqual(['A', 'B'])
    })
  })

  describe('resolveWikiLink', () => {
    const paths = ['notes/daily.md', 'projects/vault.md', 'ideas.md']

    it('resolves by filename', () => {
      expect(resolveWikiLink('daily', paths)).toBe('notes/daily.md')
    })

    it('resolves case-insensitively', () => {
      expect(resolveWikiLink('Daily', paths)).toBe('notes/daily.md')
    })

    it('resolves full path', () => {
      expect(resolveWikiLink('notes/daily', paths)).toBe('notes/daily.md')
    })

    it('returns null for unresolved links', () => {
      expect(resolveWikiLink('nonexistent', paths)).toBeNull()
    })
  })

  describe('replaceWikiLinkTarget', () => {
    it('replaces simple links', () => {
      const result = replaceWikiLinkTarget('See [[Old Name]] here.', 'Old Name', 'New Name')
      expect(result).toBe('See [[New Name]] here.')
    })

    it('preserves aliases', () => {
      const result = replaceWikiLinkTarget(
        'See [[Old Name|display]] here.',
        'Old Name',
        'New Name',
      )
      expect(result).toBe('See [[New Name|display]] here.')
    })

    it('replaces case-insensitively', () => {
      const result = replaceWikiLinkTarget('See [[old name]] here.', 'Old Name', 'New Name')
      expect(result).toBe('See [[New Name]] here.')
    })

    it('replaces multiple occurrences', () => {
      const result = replaceWikiLinkTarget('[[A]] and [[A|alias]]', 'A', 'B')
      expect(result).toBe('[[B]] and [[B|alias]]')
    })

    it('does not replace non-matching links', () => {
      const result = replaceWikiLinkTarget('[[Keep]] and [[Replace]]', 'Replace', 'New')
      expect(result).toBe('[[Keep]] and [[New]]')
    })
  })
})

describe('frontmatter', () => {
  describe('parseFrontmatter', () => {
    it('parses YAML frontmatter', () => {
      const raw = `---
title: Hello
tags:
  - one
  - two
---
# Content here`
      const result = parseFrontmatter(raw)
      expect(result.data.title).toBe('Hello')
      expect(result.data.tags).toEqual(['one', 'two'])
      expect(result.content.trim()).toBe('# Content here')
    })

    it('handles missing frontmatter', () => {
      const result = parseFrontmatter('# Just content')
      expect(result.data).toEqual({})
      expect(result.content).toBe('# Just content')
    })

    it('handles invalid YAML gracefully', () => {
      const raw = `---
invalid: [yaml: {{
---
content`
      const result = parseFrontmatter(raw)
      expect(result.content).toBeTruthy()
    })
  })

  describe('extractTags', () => {
    it('extracts array tags', () => {
      expect(extractTags({ tags: ['a', 'b'] })).toEqual(['a', 'b'])
    })

    it('extracts comma-separated string tags', () => {
      expect(extractTags({ tags: 'a, b, c' })).toEqual(['a', 'b', 'c'])
    })

    it('supports "tag" key', () => {
      expect(extractTags({ tag: 'single' })).toEqual(['single'])
    })

    it('deduplicates', () => {
      expect(extractTags({ tags: ['a', 'b'], tag: 'a' })).toEqual(['a', 'b'])
    })

    it('returns empty for no tags', () => {
      expect(extractTags({})).toEqual([])
    })
  })

  describe('serializeFrontmatter', () => {
    it('serializes data and content', () => {
      const result = serializeFrontmatter({ title: 'Test' }, '# Hello')
      expect(result).toContain('title: Test')
      expect(result).toContain('# Hello')
    })

    it('returns just content when data is empty', () => {
      expect(serializeFrontmatter({}, '# Hello')).toBe('# Hello')
    })
  })
})
