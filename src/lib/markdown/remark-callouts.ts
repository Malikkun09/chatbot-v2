type MdNode = {
  type?: string;
  value?: string;
  children?: MdNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, string>;
  };
};

const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/i;

function transformBlockquote(node: MdNode): void {
  const first = node.children?.[0];
  if (!first || first.type !== "paragraph" || !first.children?.length) return;
  const textNode = first.children[0];
  if (!textNode || textNode.type !== "text" || typeof textNode.value !== "string") return;
  const match = textNode.value.match(ALERT);
  if (!match?.[1]) return;
  const kind = match[1].toLowerCase();
  textNode.value = textNode.value.slice(match[0].length);
  node.data = {
    ...(node.data ?? {}),
    hProperties: {
      ...(node.data?.hProperties ?? {}),
      dataCallout: kind,
    },
  };
}

function walk(node: MdNode): void {
  if (node.type === "blockquote") transformBlockquote(node);
  node.children?.forEach(walk);
}

export function remarkCallouts() {
  return (tree: MdNode) => {
    walk(tree);
  };
}
