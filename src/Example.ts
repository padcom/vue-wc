import { render, createVNode, type VNodeTypes, defineComponent } from 'vue'

import Example from './Example.vue'

interface Slots {
  [key: string]: Element[]
}

interface DefineCustomElementOptions {
  shadowRoot?: boolean | ShadowRootMode | ShadowRootInit
}

// eslint-disable-next-line max-lines-per-function
function defineCustomElement(
  component: VNodeTypes,
  {
    shadowRoot = false,
  }: DefineCustomElementOptions = {},
) {
  function createRoot(element: Element) {
    if (!shadowRoot) {
      return element
    } else if (shadowRoot === true) {
      return element.attachShadow({ mode: 'open' })
    } else if (typeof shadowRoot === 'string') {
      return element.attachShadow({ mode: shadowRoot })
    } else {
      return element.attachShadow(shadowRoot)
    }
  }

  function collectSlotElements(element: Element) {
    function walk(slots: Slots, root: Element): any {
      if (root.slot) {
        return { [root.slot]: [...slots[root.slot] || [], root] }
      } else {
        return Array.from(root.querySelectorAll('*')).reduce((acc, item) => ({
          ...acc,
          ...walk(acc, item),
        }), {})
      }
    }

    return {
      default: Array.from(element.querySelectorAll('*')).filter(item => !item.slot),
      ...walk({}, element),
    } as Slots
  }

  function createVueComponentInstance(element: Element | ShadowRoot, slots: Record<string, Element[]>) {
    function wrapNodeInVueElement(el: Element, data: any) {
      return defineComponent({
        mounted() {
          // @ts-ignore Simulating scoped slots
          Object.entries(data).forEach(([name, value]) => { el[name] = value })
          this.$el.replaceWith(el)
        },
        render: () => null,
      })
    }

    const nodes = Object.fromEntries(Object.entries(slots).map(([name, elements]) => [
      name,
      (data: any) => elements.map(el => createVNode(wrapNodeInVueElement(el, data))),
    ]))

    const result = createVNode(component, null, nodes)
    render(result, element)

    return result.component
  }

  function exposeThingsOnInstance(
    instance: Node,
    things: Record<string, any>,
    options: Omit<PropertyDescriptor, 'value' | 'get' | 'set'> = {},
  ) {
    Object.entries(things).forEach(([name, value]) => {
      Object.defineProperty(instance, name, { ...options, value })
    })
  }

  function exposeProps(instance: any, element: Node) {
    Object.keys(instance.props).forEach(prop => {
      Object.defineProperty(element, prop, {
        get() {
          return instance.props[prop]
        },
        set(value: any) {
          instance.props[prop] = value
        },
      })
    })
  }

  function exposeThings(instance: any, element: Node) {
    const entries = Object.fromEntries(Object.keys(instance.exposed).map(exposed => {
      const value = typeof instance.exposed[exposed] === 'function'
        ? instance.exposed[exposed].bind(instance)
        : instance.exposed[exposed]

      return [exposed, value]
    }))

    exposeThingsOnInstance(element, entries)
  }

  function exposeEvents(instance: any, element: Node) {
    const { emit } = instance
    instance.emit = (event: string, ...rawArgs: any[]) => {
      emit(event, ...rawArgs)

      if (rawArgs.length === 0) {
        element.dispatchEvent(new CustomEvent(event))
      } else if (rawArgs.length === 1) {
        element.dispatchEvent(new CustomEvent(event, { detail: rawArgs[0] }))
      } else {
        element.dispatchEvent(new CustomEvent(event, { detail: rawArgs }))
      }
    }
  }

  return class extends HTMLElement {
    #slots: Slots
    #root: ShadowRoot | Element
    #instance: any

    constructor() {
      super()

      this.#slots = collectSlotElements(this)
      this.#root = createRoot(this)
      this.#instance = createVueComponentInstance(this.#root, this.#slots)
      exposeProps(this.#instance, this)
      exposeThings(this.#instance, this)
      exposeEvents(this.#instance, this)
    }
  }
}

customElements.define('test-component', class extends HTMLElement {
  set test(newVal: any) {
    console.log('Setting test to', newVal)
  }
})

customElements.define('example-component', defineCustomElement(Example, { shadowRoot: true }))
