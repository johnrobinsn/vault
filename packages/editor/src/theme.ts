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

    // Autocomplete dropdown
    '.cm-tooltip-autocomplete': {
      backgroundColor: 'var(--vault-bg-secondary)',
      border: '1px solid var(--vault-border)',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    },
    '.cm-tooltip-autocomplete ul li': {
      color: 'var(--vault-text-primary)',
      padding: '4px 8px',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'var(--vault-accent)',
      color: '#fff',
    },
    '.cm-tooltip-autocomplete .cm-completionLabel': {
      color: 'inherit',
    },
    '.cm-tooltip-autocomplete .cm-completionDetail': {
      color: 'var(--vault-text-muted)',
      fontStyle: 'italic',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--vault-bg-secondary)',
      border: '1px solid var(--vault-border)',
      color: 'var(--vault-text-primary)',
    },

    // Horizontal rule
    '.cm-hr-line': {
      borderBottom: '2px solid var(--vault-border)',
      margin: '8px 16px',
    },

    // Task checkboxes
    '.cm-task-checkbox': {
      appearance: 'none',
      width: '16px',
      height: '16px',
      border: '2px solid var(--vault-text-muted)',
      borderRadius: '3px',
      verticalAlign: 'middle',
      cursor: 'pointer',
      position: 'relative',
      marginRight: '4px',
    },
    '.cm-task-checkbox:checked': {
      backgroundColor: 'var(--vault-accent)',
      borderColor: 'var(--vault-accent)',
    },
    '.cm-task-checkbox:checked::after': {
      content: '""',
      position: 'absolute',
      left: '4px',
      top: '1px',
      width: '4px',
      height: '8px',
      border: 'solid #fff',
      borderWidth: '0 2px 2px 0',
      transform: 'rotate(45deg)',
    },
    '.cm-task-checkbox:hover': {
      borderColor: 'var(--vault-accent)',
    },

    // Hidden table lines (raw markdown collapsed while widget is shown)
    '.cm-table-hidden-line': {
      fontSize: '0',
      lineHeight: '0',
      padding: '0 !important',
      color: 'transparent',
    },
    // But the widget inside the first hidden line must be visible
    '.cm-table-hidden-line .cm-table-editor': {
      fontSize: '14px',
      lineHeight: '1.5',
      color: 'var(--vault-text-primary)',
    },

    // Table editor
    '.cm-table-editor': {
      margin: '8px 16px',
      borderRadius: '6px',
      border: '1px solid var(--vault-border)',
      overflow: 'hidden',
    },
    '.cm-table-toolbar': {
      display: 'flex',
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: 'var(--vault-bg-tertiary)',
      borderBottom: '1px solid var(--vault-border)',
    },
    '.cm-table-btn': {
      padding: '2px 8px',
      border: '1px solid var(--vault-border)',
      borderRadius: '4px',
      background: 'var(--vault-bg-secondary)',
      color: 'var(--vault-text-secondary)',
      fontSize: '11px',
      cursor: 'pointer',
      fontFamily: 'inherit',
    },
    '.cm-table-btn:hover': {
      background: 'var(--vault-bg-primary)',
      color: 'var(--vault-text-primary)',
    },
    '.cm-table': {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
    },
    '.cm-table th, .cm-table td': {
      border: '1px solid var(--vault-border)',
      padding: '6px 10px',
      minWidth: '60px',
    },
    '.cm-table th': {
      backgroundColor: 'var(--vault-bg-tertiary)',
      fontWeight: '600',
      fontSize: '13px',
    },
    '.cm-table-cell:focus': {
      outline: '2px solid var(--vault-accent)',
      outlineOffset: '-2px',
    },
    '.cm-table-source-line': {
      backgroundColor: 'var(--vault-bg-secondary)',
    },
  })
}
