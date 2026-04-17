import { EditorView, WidgetType } from '@codemirror/view'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { toggleFrontmatterSource } from './frontmatter-plugin.js'

type PropValue = string | number | boolean | string[] | null

interface Property {
  key: string
  value: PropValue
}

export class FrontmatterWidget extends WidgetType {
  private yamlSource: string
  private from: number
  private to: number

  constructor(yamlSource: string, from: number, to: number, _view: EditorView) {
    super()
    this.yamlSource = yamlSource
    this.from = from
    this.to = to
  }

  eq(other: FrontmatterWidget): boolean {
    return this.yamlSource === other.yamlSource
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div')
    container.className = 'cm-frontmatter-editor'

    let data: Record<string, PropValue> = {}
    try {
      const parsed = parseYaml(this.yamlSource)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, PropValue>
      }
    } catch {
      // Invalid YAML — show source mode
      container.innerHTML = '<div class="cm-fm-error">Invalid frontmatter YAML</div>'
      return container
    }

    const props: Property[] = Object.entries(data).map(([key, value]) => ({
      key,
      value: value as PropValue,
    }))

    const from = this.from
    const to = this.to

    const commit = (updatedProps: Property[]) => {
      const obj: Record<string, PropValue> = {}
      for (const p of updatedProps) {
        if (p.key.trim()) obj[p.key.trim()] = p.value
      }
      const yaml = stringifyYaml(obj).trim()
      const newFm = `---\n${yaml}\n---`
      view.dispatch({ changes: { from, to, insert: newFm } })
    }

    // Header
    const header = document.createElement('div')
    header.className = 'cm-fm-header'

    const title = document.createElement('span')
    title.className = 'cm-fm-title'
    title.textContent = 'Properties'
    header.appendChild(title)

    const actions = document.createElement('span')
    actions.className = 'cm-fm-actions'

    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.className = 'cm-fm-btn'
    addBtn.textContent = '+'
    addBtn.title = 'Add property'
    addBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      props.push({ key: '', value: '' })
      commit(props)
    })
    actions.appendChild(addBtn)

    const srcBtn = document.createElement('button')
    srcBtn.type = 'button'
    srcBtn.className = 'cm-fm-btn'
    srcBtn.textContent = 'YAML'
    srcBtn.title = 'Edit as YAML'
    srcBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      view.dispatch({
        effects: toggleFrontmatterSource.of(true),
        selection: { anchor: from },
      })
    })
    actions.appendChild(srcBtn)

    header.appendChild(actions)
    container.appendChild(header)

    // Property rows
    const table = document.createElement('div')
    table.className = 'cm-fm-table'

    for (let i = 0; i < props.length; i++) {
      const prop = props[i]
      const row = document.createElement('div')
      row.className = 'cm-fm-row'

      // Key input
      const keyInput = document.createElement('input')
      keyInput.type = 'text'
      keyInput.className = 'cm-fm-key'
      keyInput.value = prop.key
      keyInput.placeholder = 'property'
      keyInput.addEventListener('blur', () => {
        const newKey = keyInput.value.trim()
        if (newKey !== prop.key) {
          props[i] = { ...prop, key: newKey }
          commit(props)
        }
      })
      keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') keyInput.blur()
      })
      row.appendChild(keyInput)

      // Value editor
      const value = prop.value

      if (Array.isArray(value)) {
        // List/tags — show as comma-separated editable
        const valInput = document.createElement('input')
        valInput.type = 'text'
        valInput.className = 'cm-fm-value'
        valInput.value = value.join(', ')
        valInput.placeholder = 'value1, value2'
        valInput.addEventListener('blur', () => {
          const items = valInput.value.split(',').map((s) => s.trim()).filter(Boolean)
          props[i] = { ...prop, value: items }
          commit(props)
        })
        valInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') valInput.blur()
        })
        row.appendChild(valInput)
      } else if (typeof value === 'boolean') {
        // Checkbox
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.className = 'cm-fm-checkbox'
        checkbox.checked = value
        checkbox.addEventListener('change', () => {
          props[i] = { ...prop, value: checkbox.checked }
          commit(props)
        })
        row.appendChild(checkbox)
      } else {
        // Text/number/date — single input
        const valInput = document.createElement('input')
        valInput.type = 'text'
        valInput.className = 'cm-fm-value'
        valInput.value = value != null ? String(value) : ''
        valInput.placeholder = 'value'
        valInput.addEventListener('blur', () => {
          let newVal: PropValue = valInput.value
          // Auto-detect types
          if (newVal === 'true') newVal = true as PropValue
          else if (newVal === 'false') newVal = false as PropValue
          else if (/^\d+$/.test(newVal)) newVal = parseInt(newVal) as PropValue
          props[i] = { ...prop, value: newVal }
          commit(props)
        })
        valInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') valInput.blur()
        })
        row.appendChild(valInput)
      }

      // Delete button
      const delBtn = document.createElement('button')
      delBtn.type = 'button'
      delBtn.className = 'cm-fm-del'
      delBtn.textContent = '\u00d7'
      delBtn.title = 'Remove property'
      delBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        props.splice(i, 1)
        commit(props)
      })
      row.appendChild(delBtn)

      table.appendChild(row)
    }

    container.appendChild(table)
    return container
  }

  ignoreEvent(): boolean {
    return true
  }
}
