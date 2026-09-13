import { defaultSchema } from "rehype-sanitize";

const defaultAttrs = defaultSchema.attributes ?? {};

export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...new Set([...(defaultSchema.tagNames ?? []), "input"])],
  attributes: {
    ...defaultAttrs,
    code: [...(defaultAttrs.code ?? []), ["className", /^language-./], "className"],
    pre: [...(defaultAttrs.pre ?? []), "className"],
    span: [...(defaultAttrs.span ?? []), ["className", /^hljs-/], "className"],
    th: [...(defaultAttrs.th ?? []), "align", "style"],
    td: [...(defaultAttrs.td ?? []), "align", "style"],
    table: [...(defaultAttrs.table ?? []), "className"],
    ul: [...(defaultAttrs.ul ?? []), "className"],
    li: [...(defaultAttrs.li ?? []), "className"],
    input: ["type", "disabled", "checked"],
    img: [...(defaultAttrs.img ?? []), "src", "alt", "title", "width", "height"],
    a: [...(defaultAttrs.a ?? []), "href", "title", "rel", "target"],
    div: [...(defaultAttrs.div ?? []), ["className", /^callout/], "className", "dataCallout"],
    blockquote: [...(defaultAttrs.blockquote ?? []), "dataCallout", "className"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};
