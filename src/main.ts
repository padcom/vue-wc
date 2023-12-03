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
    // console.log('Setting column:', newVal)
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
    // console.log('Setting column:', newVal)
    this.#column = newVal
    this.render()
  }

  set row(newVal: any) {
    // console.log('Setting row:', newVal)
    this.#row = newVal
    this.render()
  }
})

// TODO: figure out how to make it independent that this component needs to be defined last!
customElements.define('data-list', defineCustomElement(DataList, { shadowRoot: false }))
