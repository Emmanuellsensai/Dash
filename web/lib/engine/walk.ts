export interface Loc {
  line: number;
  column: number;
}

export interface Node {
  type: string;
  loc?: { start: Loc; end: Loc };
  [key: string]: unknown;
}

const SKIP_KEYS = new Set(["parent", "loc", "range", "start", "end", "comments", "tokens"]);

export function isNode(value: unknown): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

/**
 * Pre-order traversal over an ESTree tree. Works for both acorn and
 * typescript-estree output because unknown node types are descended into
 * generically. ancestors excludes the visited node itself.
 */
export function walk(
  root: Node | null | undefined,
  visitor: (node: Node, ancestors: Node[]) => void,
): void {
  if (!root) return;
  const ancestors: Node[] = [];
  function visit(node: Node): void {
    visitor(node, ancestors);
    ancestors.push(node);
    for (const key of Object.keys(node)) {
      if (SKIP_KEYS.has(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isNode(item)) visit(item);
        }
      } else if (isNode(value)) {
        visit(value);
      }
    }
    ancestors.pop();
  }
  visit(root);
}

export function findNodes(
  root: Node | null | undefined,
  predicate: (node: Node) => boolean,
): Node[] {
  const out: Node[] = [];
  walk(root, (node) => {
    if (predicate(node)) out.push(node);
  });
  return out;
}

export function lineOf(node: Node): number {
  return node.loc?.start.line ?? 0;
}

export function columnOf(node: Node): number {
  return node.loc?.start.column ?? 0;
}

export function isFunctionNode(node: Node): boolean {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}
