import { walk, type Node } from "./walk";

export interface Feature {
  label: string;
  match: (node: Node) => boolean;
}

const MODULE_TYPES = new Set([
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
  "ImportExpression",
]);

const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

function isAsyncOrAwait(node: Node): boolean {
  return (
    (FUNCTION_TYPES.has(node.type) && node.async === true) || node.type === "AwaitExpression"
  );
}

export const FEATURES: Record<string, Feature> = {
  var_declaration: {
    label: "var declaration",
    match: (n) => n.type === "VariableDeclaration" && n.kind === "var",
  },
  let_declaration: {
    label: "let declaration",
    match: (n) => n.type === "VariableDeclaration" && n.kind === "let",
  },
  const_declaration: {
    label: "const declaration",
    match: (n) => n.type === "VariableDeclaration" && n.kind === "const",
  },
  template_literal: { label: "template literal", match: (n) => n.type === "TemplateLiteral" },
  arrow_function: {
    label: "arrow function",
    match: (n) => n.type === "ArrowFunctionExpression",
  },
  function_declaration: {
    label: "function declaration",
    match: (n) => n.type === "FunctionDeclaration",
  },
  for_loop: { label: "for loop", match: (n) => n.type === "ForStatement" },
  while_loop: { label: "while loop", match: (n) => n.type === "WhileStatement" },
  for_of: { label: "for...of loop", match: (n) => n.type === "ForOfStatement" },
  for_in: { label: "for...in loop", match: (n) => n.type === "ForInStatement" },
  switch: { label: "switch statement", match: (n) => n.type === "SwitchStatement" },
  ternary: { label: "ternary ( ? : )", match: (n) => n.type === "ConditionalExpression" },
  destructuring: {
    label: "destructuring",
    match: (n) => n.type === "ObjectPattern" || n.type === "ArrayPattern",
  },
  spread: {
    label: "spread or rest operator",
    match: (n) => n.type === "SpreadElement" || n.type === "RestElement",
  },
  async_await: { label: "async or await", match: isAsyncOrAwait },
  try_catch: { label: "try/catch block", match: (n) => n.type === "TryStatement" },
  class_declaration: { label: "class declaration", match: (n) => n.type === "ClassDeclaration" },
  loose_equality: {
    label: "loose equality ( == or != )",
    match: (n) =>
      n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!="),
  },
  strict_equality: {
    label: "strict equality ( === or !== )",
    match: (n) =>
      n.type === "BinaryExpression" && (n.operator === "===" || n.operator === "!=="),
  },
  eval_call: {
    label: "eval call",
    match: (n) =>
      n.type === "CallExpression" &&
      (n.callee as Node | undefined)?.type === "Identifier" &&
      (n.callee as Node).name === "eval",
  },
  import_export: { label: "import or export statement", match: (n) => MODULE_TYPES.has(n.type) },
  optional_chaining: {
    label: "optional chaining ( ?. )",
    match: (n) => n.type === "ChainExpression" || n.optional === true,
  },
  nullish_coalescing: {
    label: "nullish coalescing ( ?? )",
    match: (n) => n.type === "BinaryExpression" && n.operator === "??",
  },
  typeof_operator: {
    label: "typeof operator",
    match: (n) => n.type === "UnaryExpression" && n.operator === "typeof",
  },
};

export const FEATURE_NAMES = Object.keys(FEATURES);

export function countFeature(root: Node | null | undefined, feature: Feature): number {
  if (!root) return 0;
  let count = 0;
  walk(root, (node) => {
    if (feature.match(node)) count++;
  });
  return count;
}
