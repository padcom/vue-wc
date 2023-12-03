/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  render,
  createVNode,
  defineComponent,
  type VNodeTypes,
  type ComponentInternalInstance,
} from 'vue'

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

  function getComponentStyles() {
    // @ts-ignore The `styles` is not defined unless it is a .ce.vue file
    return component.styles ? String(component.styles).trim() : null
  }

  function createStyles() {
    const css = getComponentStyles()
    if (css) {
      const style = document.createElement('style')
      style.innerHTML = css

      return style
    } else {
      return null
    }
  }

  function createGlobalStyle() {
    const style = createStyles()
    if (style) document.head.appendChild(style)
  }

  function createElementStyle(element: Element | ShadowRoot) {
    const style = createStyles()
    if (style) element.appendChild(style)
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

  function getAttributes(element: Element) {
    return Object.fromEntries(element.getAttributeNames().map(attr => [attr, element.getAttribute(attr)]))
  }

  // eslint-disable-next-line max-lines-per-function
  function createVueComponentInstance(
    element: Element | ShadowRoot,
    attrs: Record<string, string | null>,
    slots: Record<string, Element[]>,
  ) {
    function wrapNodeInVueElement(el: Element, data: any) {
      return defineComponent({
        mounted() {
          // Treating the given element as template so that multiple instances
          // can be created from the given element.
          // This has a limitation as of now that only HTML-specified elements
          // that have already been created by the browser can be used.
          // Don't know how this is going to behave when elements are added
          // dynamically to the DOM. Probably it will be needed to re-create
          // the entire element. For that to work the original slot elements
          // need to be re-added to the DOM.
          // Something to work on next...
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

    const result = createVNode(component, attrs, nodes)
    render(result, element)

    return result.component
  }

  function exposeProps(instance: ComponentInternalInstance, element: Node) {
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

  if (!shadowRoot) createGlobalStyle()

  return class extends HTMLElement {
    constructor() {
      super()

      const slots = collectSlotElements(this)
      removeSlotElements(slots)

      const root = createRoot(this)
      if (shadowRoot) createElementStyle(root)

      const instance = createVueComponentInstance(root, getAttributes(this), slots)
      if (instance) {
        exposeProps(instance, this)
        exposeExposed(instance, this)
        exposeEvents(instance, this)
      }
    }
  }
}
