import { h, defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'
import type { MarkdownTokenComponentMap } from '../types/renderer.js'

// Forward declaration — resolved at runtime to break the circular import
// between default-renderers and MarkdownTokenNode.
// Typed as `object` to stay compatible with Vue 2's h() first argument.
let MarkdownTokenNodeComponent: object | null = null

export function registerMarkdownTokenNode(comp: object): void {
  MarkdownTokenNodeComponent = comp
}

// Vue 2 h() format: component props go in props:{}, HTML attrs go in attrs:{}
function renderChildren(token: StatefulToken) {
  if (!token.children?.length || !MarkdownTokenNodeComponent) return []
  return token.children.map((child) =>
    h(MarkdownTokenNodeComponent!, { key: child.id, props: { token: child } })
  )
}

function stateAttrs(token: StatefulToken) {
  return { 'data-state': token.state }
}

// text-align shorthand style string avoids csstype TextAlign union type issues
function alignStyle(token: StatefulToken): string | undefined {
  const align = token.meta?.align as string | undefined
  return align ? `text-align: ${align}` : undefined
}

const tokenProp = {
  type: Object as PropType<StatefulToken>,
  required: true as const,
}

export const defaultRenderers: MarkdownTokenComponentMap = {
  paragraph: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'p',
          { class: 'ms-token-paragraph', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  heading: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () => {
        const level = (props.token.meta?.level as number) ?? 1
        const tag = `h${Math.min(Math.max(level, 1), 6)}`
        return h(
          tag,
          {
            class: `ms-token-heading ms-token-heading-${level}`,
            attrs: stateAttrs(props.token),
          },
          renderChildren(props.token)
        )
      }
    },
  }),

  fence: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'pre',
          { class: 'ms-token-fence', attrs: stateAttrs(props.token) },
          [
            h(
              'code',
              {
                class: props.token.meta?.info
                  ? `language-${props.token.meta.info}`
                  : undefined,
              },
              [props.token.content ?? '']
            ),
          ]
        )
    },
  }),

  blockquote: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'blockquote',
          { class: 'ms-token-blockquote', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  bullet_list: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'ul',
          { class: 'ms-token-bullet-list', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  ordered_list: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'ol',
          { class: 'ms-token-ordered-list', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  list_item: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'li',
          { class: 'ms-token-list-item', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  strong: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'strong',
          { class: 'ms-token-strong', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  em: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'em',
          { class: 'ms-token-em', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  link: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'a',
          {
            class: 'ms-token-link',
            attrs: {
              href: props.token.meta?.href as string | undefined,
              title: props.token.meta?.title as string | undefined,
              ...stateAttrs(props.token),
            },
          },
          renderChildren(props.token)
        )
    },
  }),

  code_inline: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'code',
          { class: 'ms-token-code-inline', attrs: stateAttrs(props.token) },
          [props.token.content ?? '']
        )
    },
  }),

  softbreak: defineComponent({
    props: { token: tokenProp },
    setup() {
      return () => h('br')
    },
  }),

  // Vue 2 cannot return plain strings from render functions.
  // Wrap text in a <span> (inline element, no visual impact).
  text: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () => h('span', { class: 'ms-token-text' }, [props.token.content ?? ''])
    },
  }),

  image: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h('img', {
          class: 'ms-token-image',
          attrs: {
            src: props.token.meta?.src as string | undefined,
            alt: props.token.meta?.alt as string | undefined,
            title: props.token.meta?.title as string | undefined,
            ...stateAttrs(props.token),
          },
        })
    },
  }),

  // Vue 2 does not support Fragment. Wrap inline children in a <span>.
  inline: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () => h('span', { class: 'ms-token-inline' }, renderChildren(props.token))
    },
  }),

  table: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'table',
          { class: 'ms-token-table', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  thead: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'thead',
          { class: 'ms-token-thead', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  tbody: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'tbody',
          { class: 'ms-token-tbody', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  tr: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'tr',
          { class: 'ms-token-tr', attrs: stateAttrs(props.token) },
          renderChildren(props.token)
        )
    },
  }),

  th: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'th',
          {
            class: 'ms-token-th',
            style: alignStyle(props.token),
            attrs: stateAttrs(props.token),
          },
          renderChildren(props.token)
        )
    },
  }),

  td: defineComponent({
    props: { token: tokenProp },
    setup(props) {
      return () =>
        h(
          'td',
          {
            class: 'ms-token-td',
            style: alignStyle(props.token),
            attrs: stateAttrs(props.token),
          },
          renderChildren(props.token)
        )
    },
  }),
}
