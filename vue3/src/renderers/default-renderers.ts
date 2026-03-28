import { h, Fragment, defineComponent } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'
import type { MarkdownTokenComponentMap } from '../types/renderer.js'

// Forward declaration — resolved at runtime to break the circular import
// between default-renderers and MarkdownTokenNode.
let MarkdownTokenNodeComponent: ReturnType<typeof defineComponent> | null = null

export function registerMarkdownTokenNode(
  comp: ReturnType<typeof defineComponent>
): void {
  MarkdownTokenNodeComponent = comp
}

function renderChildren(token: StatefulToken) {
  if (!token.children?.length || !MarkdownTokenNodeComponent) return []
  return token.children.map((child) =>
    h(MarkdownTokenNodeComponent!, { key: child.id, token: child })
  )
}

function stateAttrs(token: StatefulToken) {
  return { 'data-state': token.state }
}

export const defaultRenderers: MarkdownTokenComponentMap = {
  paragraph: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'p',
          { class: 'ms-token-paragraph', ...stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  heading: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () => {
        const level = (props.token.meta?.level as number) ?? 1
        const tag = `h${Math.min(Math.max(level, 1), 6)}`
        return h(
          tag,
          {
            class: `ms-token-heading ms-token-heading-${level}`,
            ...stateAttrs(props.token),
          },
          renderChildren(props.token)
        )
      }
    },
  }),

  fence: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'pre',
          { class: 'ms-token-fence', ...stateAttrs(props.token) },
          [h('code', { class: props.token.meta?.info ? `language-${props.token.meta.info}` : undefined }, props.token.content ?? '')]
        )
    },
  }),

  blockquote: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'blockquote',
          { class: 'ms-token-blockquote', ...stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  bullet_list: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'ul',
          { class: 'ms-token-bullet-list', ...stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  ordered_list: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'ol',
          { class: 'ms-token-ordered-list', ...stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  list_item: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'li',
          { class: 'ms-token-list-item', ...stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  strong: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'strong',
          { class: 'ms-token-strong', ...stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  em: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'em',
          { class: 'ms-token-em', ...stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  link: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'a',
          {
            class: 'ms-token-link',
            href: props.token.meta?.href as string | undefined,
            title: props.token.meta?.title as string | undefined,
            ...stateAttrs(props.token),
          },
          renderChildren(props.token)
        )
    },
  }),

  code_inline: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h(
          'code',
          { class: 'ms-token-code-inline', ...stateAttrs(props.token) },
          props.token.content ?? ''
        )
    },
  }),

  softbreak: defineComponent({
    props: ['token'],
    setup(_props: { token: StatefulToken }) {
      return () => h('br')
    },
  }),

  text: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () => props.token.content ?? ''
    },
  }),

  image: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () =>
        h('img', {
          class: 'ms-token-image',
          src: props.token.meta?.src as string | undefined,
          alt: props.token.meta?.alt as string | undefined,
          title: props.token.meta?.title as string | undefined,
          ...stateAttrs(props.token),
        })
    },
  }),

  inline: defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () => h(Fragment, null, renderChildren(props.token))
    },
  }),
}
