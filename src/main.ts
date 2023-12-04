import './styles.css'

import { defineCustomElement } from '.'
import DataList from './DataList.ce.vue'

customElements.define('table-header', class extends HTMLElement {
  #placeholder: Text

  constructor() {
    super()

    this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.innerHTML = `:host { display: table-cell; font-weight: bold; }`
    this.shadowRoot?.appendChild(style)

    this.#placeholder = document.createTextNode('')
    this.shadowRoot?.appendChild(this.#placeholder)
  }

  set column(newVal: any) {
    this.#placeholder.data = `col-${newVal.id}`
  }
})

customElements.define('table-cell', class extends HTMLElement {
  #placeholder: Text
  #column: any = null
  #row: any = null

  constructor() {
    super()

    this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.innerHTML = `:host { display: table-cell; }`
    this.shadowRoot?.appendChild(style)

    this.#placeholder = document.createTextNode('')
    this.shadowRoot?.appendChild(this.#placeholder)
  }

  render() {
    if (this.#column && this.#row) {
      this.#placeholder.data = `${this.#column.id}/${this.#row[this.#column.id]}`
    } else {
      this.#placeholder.data = '(not initialized)'
    }
  }

  set column(newVal: any) {
    this.#column = newVal
    this.render()
  }

  get row() {
    return this.#row
  }

  set row(newVal: any) {
    this.#row = newVal
    this.render()
  }
})

// TODO: figure out how to make it independent that this component needs to be defined last!
customElements.define('data-list', defineCustomElement(DataList, { shadowRoot: false }))

import { randomString } from './random-string'

// Dynamically put together a <data-list>
const table = document.createElement('data-list')
const idHeaderTemplate = document.createElement('table-header')
idHeaderTemplate.slot = 'th.id'
idHeaderTemplate.addEventListener('click', () => { console.log('ID Header clicked') })
table.appendChild(idHeaderTemplate)
const idCellTemplate = document.createElement('table-cell')
idCellTemplate.slot = 'td.id'
// @ts-ignore xxx
idCellTemplate.addEventListener('click', e => { console.log('ID cell clicked', e.target.row.title = randomString()) })
table.appendChild(idCellTemplate)

const app = document.querySelector('#app')
app?.appendChild(table)
