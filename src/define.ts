/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ref,
  render,
  createVNode,
  defineComponent,
  type PropType,
  type VNodeTypes,
  type ComponentInternalInstance,
} from 'vue'

// Monkey-patching EventTarget.addEventListener so that we can gather the registered
// event handlers so that after the node has been cloned we can add them to the clone

declare global {
  interface EventTarget {
    registeredEventListeners?: Map<string, {
      handler<K extends keyof HTMLElementEventMap>(this: HTMLElement, ev: HTMLElementEventMap[K]): any,
      options: AddEventListenerOptions,
    }>

    internalAddEventListener(
      this: EventTarget,
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean,
    ): void
  }
}

EventTarget.prototype.internalAddEventListener = EventTarget.prototype.addEventListener

EventTarget.prototype.addEventListener = function(
  this: EventTarget,
  name: string,
  handler: any,
  options?: AddEventListenerOptions,
) {
  this.registeredEventListeners ||= new Map<string, any>()
  this.registeredEventListeners.set(name, { handler, options: options || {} })

  this.internalAddEventListener(name, handler, options)
}

function groupBy<T>(elements: T[], callback: (item: T) => string) {
  return elements.reduce((acc, item) => {
    const key = callback(item)

    return {
      ...acc,
      [key]: [...acc[key] || [], item],
    }
  }, {} as Record<string, T[]>)
}

interface ClonedNode extends Node {
  cloned: true
}

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
    return groupBy(Array.from(element.children), node => node.slot || 'default') as Slots
  }

  function removeSlotElements(slots: Slots) {
    Object.values(slots).forEach(slot => slot.forEach(element => element.remove()))
  }

  function getAttributes(element: Element) {
    return Object.fromEntries(element.getAttributeNames().map(attr => [attr, element.getAttribute(attr)]))
  }

  const SlotWrapper = defineComponent({
    props: {
      elements: { type: Object as PropType<Element[]>, default: () => ref([]) },
      slotData: { type: Object, default: () => ({}) },
    },
    mounted() {
      this.updateContent()
    },
    updated() {
      this.updateContent()
    },
    methods: {
      // eslint-disable-next-line max-lines-per-function
      updateContent() {
        const content = this.elements.map(el => {
          // Treating the given element as template so that multiple instances
          // can be created from the given element.
          // This has a limitation as of now that only HTML-specified elements
          // that have already been created by the browser can be used.
          // Don't know how this is going to behave when elements are added
          // dynamically to the DOM. Probably it will be needed to re-create
          // the entire element. For that to work the original slot elements
          // need to be re-added to the DOM.
          const result = el.cloneNode(true) as ClonedNode
          result.cloned = true

          // Since the Element.cloneNode() doesn't clone event handlers for some reason
          // we need to mitigate that with our own concept of registered event handlers.
          if (el.registeredEventListeners) {
            el.registeredEventListeners.forEach(({ handler, options }, name) => {
              result.internalAddEventListener(name, handler, options)
            })
          }

          // @ts-ignore Simulating scoped slots
          Object.entries(this.slotData).forEach(([name, value]) => { result[name] = value })

          return result
        })

        this.$el.replaceWith(...content)
      },
    },
    render: () => null,
  })

  function createVueComponentInstance(
    element: Element | ShadowRoot,
    attrs: Record<string, string | null>,
    slots: Slots,
  ) {
    const nodes = Object.fromEntries(Object.entries(slots).map(([name, elements]) => [
      name,
      (data: any) => createVNode(SlotWrapper, { elements, slotData: data }),
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
    #root: Element | ShadowRoot

    constructor() {
      super()

      this.#root = createRoot(this)

      if (shadowRoot) createElementStyle(this.#root)
    }

    connectedCallback() {
      const slots = collectSlotElements(this)
      removeSlotElements(slots)

      const instance = createVueComponentInstance(this.#root, getAttributes(this), slots)
      if (instance) {
        exposeProps(instance, this)
        exposeExposed(instance, this)
        exposeEvents(instance, this)
      }
    }
  }
}
