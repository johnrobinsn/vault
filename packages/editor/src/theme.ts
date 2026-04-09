import { EditorView } from '@codemirror/view'
import { type Extension } from '@codemirror/state'

/**
 * Base editor theme — uses CSS custom properties from the host app
 * so it automatically adapts to dark/light themes.
 */
export function vaultEditorTheme(): Extension {
  return EditorView.theme({
    '&': {
      fontSize: '16px',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      backgroundColor: 'var(--vault-bg-primary)',
      color: 'var(--vault-text-primary)',
    },
    '.cm-content': {
      fontFamily: 'inherit',
      padding: '16px 0',
      maxWidth: '800px',
      margin: '0 auto',
    },
    '.cm-line': {
      padding: '0 16px',
      lineHeight: '1.6',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--vault-accent)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'var(--vault-accent) !important',
      opacity: '0.3',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--vault-accent) !important',
      opacity: '0.3',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--vault-bg-secondary)',
    },

    // Heading styles
    '.cm-heading-1': {
      fontSize: '2em',
      fontWeight: '700',
      lineHeight: '1.3',
    },
    '.cm-heading-2': {
      fontSize: '1.6em',
      fontWeight: '600',
      lineHeight: '1.35',
    },
    '.cm-heading-3': {
      fontSize: '1.3em',
      fontWeight: '600',
      lineHeight: '1.4',
    },
    '.cm-heading-4': {
      fontSize: '1.1em',
      fontWeight: '600',
    },
    '.cm-heading-5': {
      fontSize: '1em',
      fontWeight: '600',
    },
    '.cm-heading-6': {
      fontSize: '0.9em',
      fontWeight: '600',
      color: 'var(--vault-text-secondary)',
    },

    // Emphasis styles
    '.cm-strong': {
      fontWeight: '700',
    },
    '.cm-em': {
      fontStyle: 'italic',
    },
    '.cm-strikethrough': {
      textDecoration: 'line-through',
    },

    // Inline code
    '.cm-inline-code': {
      fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
      fontSize: '0.9em',
      backgroundColor: 'var(--vault-bg-tertiary)',
      borderRadius: '3px',
      padding: '1px 4px',
    },

    // Links
    '.cm-link-text': {
      color: 'var(--vault-link)',
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },

    // Wiki-links
    '.cm-wikilink': {
      color: 'var(--vault-link)',
      cursor: 'pointer',
      textDecoration: 'none',
      borderBottom: '1px solid var(--vault-link)',
      '&:hover': {
        color: 'var(--vault-link-hover)',
        borderBottomColor: 'var(--vault-link-hover)',
      },
    },
    '.cm-wikilink-syntax': {
      color: 'var(--vault-text-muted)',
    },
    '.cm-wikilink-target': {
      color: 'var(--vault-link)',
    },

    // Horizontal rule
    '.cm-hr-line': {
      borderBottom: '2px solid var(--vault-border)',
      margin: '8px 16px',
    },
  })
}
