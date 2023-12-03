import { render, createVNode, type VNodeTypes, defineComponent } from 'vue'

export interface Slots {
  [key: string]: Element[]
}

export interface DefineCustomElementOptions {
  shadowRoot?: boolean | ShadowRootMode | ShadowRootInit
}

// eslint-disable-next-line max-lines-per-function
export function defineCustomElement(
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

  // function removeUndefinedElementsFromSlots(root: Element, slots: Slots) {
  //   const notDefinedTags = Array.from(root.querySelectorAll(':not(:defined)')).map(el => el.tagName)
  //   Object.entries(slots).forEach(([name, elements]) => {
  //     slots[name] = elements.filter(el => !notDefinedTags.includes(el.tagName))
  //   })

  //   return notDefinedTags
  // }

  function removeSlotElements(slots: Slots) {
    Object.values(slots).forEach(slot => slot.forEach(element => element.remove()))
  }

  function createVueComponentInstance(element: Element | ShadowRoot, slots: Record<string, Element[]>) {
    function wrapNodeInVueElement(el: Element, data: any) {
      return defineComponent({
        mounted() {
          const content = el.cloneNode(true)
          // @ts-ignore Simulating scoped slots
          Object.entries(data).forEach(([name, value]) => { content[name] = value })
          this.$el.replaceWith(content)
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

  function exposeExposed(instance: any, element: Node) {
    const entries = Object.fromEntries(Object.keys(instance.exposed).map(exposed => {
      const value = typeof instance.exposed[exposed] === 'function'
        ? instance.exposed[exposed].bind(instance)
        : instance.exposed[exposed]

      return [exposed, value]
    }))

    Object.entries(entries).forEach(([name, value]) => {
      Object.defineProperty(element, name, { value, writable: false })
    })
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
      removeSlotElements(this.#slots)
      this.#root = createRoot(this)
      this.#instance = createVueComponentInstance(this.#root, this.#slots)
      exposeProps(this.#instance, this)
      exposeExposed(this.#instance, this)
      exposeEvents(this.#instance, this)
    }
  }
}
