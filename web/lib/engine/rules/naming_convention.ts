import { z } from "zod";
import { columnOf, lineOf, walk, type Node } from "../walk";
import type { EngineFile, RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  target: z.enum(["variable", "function", "class", "constant"]),
  style: z.enum(["camelCase", "PascalCase", "UPPER_SNAKE"]),
});

type Params = z.infer<typeof paramsSchema>;

const STYLES: Record<string, RegExp> = {
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  UPPER_SNAKE: /^[A-Z][A-Z0-9_]*$/,
};

const MAX_EVIDENCE = 10;

interface NameUse {
  name: string;
  node: Node;
}

function keyName(key: unknown): string | null {
  if (!key || typeof key !== "object") return null;
  const k = key as Node;
  if (k.type === "Identifier" && typeof k.name === "string") return k.name;
  if (k.type === "Literal" && typeof k.value === "string") return k.value;
  return null;
}

function identifierName(node: Node | null | undefined): string | null {
  return node?.type === "Identifier" && typeof node.name === "string" ? node.name : null;
}

function collectUses(ast: Node, target: string): NameUse[] {
  const uses: NameUse[] = [];
  walk(ast, (node, ancestors) => {
    if (node.type === "VariableDeclarator") {
      const id = node.id as Node | undefined;
      const name = identifierName(id);
      if (!name || !id) return;
      const init = node.init as Node | null | undefined;
      const isFunctionValue =
        init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression";
      const parent = ancestors[ancestors.length - 1];
      const declKind = parent?.type === "VariableDeclaration" ? parent.kind : null;
      if (target === "function" && isFunctionValue) uses.push({ name, node: id });
      else if (target === "variable" && (declKind === "let" || declKind === "var"))
        uses.push({ name, node: id });
      else if (target === "constant" && declKind === "const" && !isFunctionValue)
        uses.push({ name, node: id });
      return;
    }
    if (target === "function") {
      if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
        const id = node.id as Node | null;
        const name = identifierName(id);
        if (name && id) uses.push({ name, node: id });
        return;
      }
      if (
        node.type === "MethodDefinition" ||
        node.type === "Property" ||
        node.type === "PropertyDefinition"
      ) {
        const name = keyName(node.key);
        if (name) uses.push({ name, node: (node.key as Node) ?? node });
      }
      return;
    }
    if (target === "class" && (node.type === "ClassDeclaration" || node.type === "ClassExpression")) {
      const id = node.id as Node | null;
      const name = identifierName(id);
      if (name && id) uses.push({ name, node: id });
    }
  });
  return uses;
}

export const namingConvention: RuleModule<Params> = {
  id: "naming_convention",
  label: "Naming convention",
  needsParse: true,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const pattern = STYLES[params.style];
    const violations: { file: EngineFile; use: NameUse }[] = [];
    for (const file of ctx.files) {
      if (!file.parsed.ast) continue;
      for (const use of collectUses(file.parsed.ast, params.target)) {
        if (!pattern.test(use.name)) violations.push({ file, use });
      }
    }
    if (violations.length === 0) return { passed: true, evidence: [] };

    const evidence = violations.slice(0, MAX_EVIDENCE).map(({ file, use }) => ({
      file: file.path,
      line: lineOf(use.node),
      column: columnOf(use.node),
      detail: `Name "${use.name}" does not match ${params.style}`,
    }));
    if (violations.length > MAX_EVIDENCE) {
      evidence.push({
        file: violations[MAX_EVIDENCE].file.path,
        line: 0,
        column: 0,
        detail: `+${violations.length - MAX_EVIDENCE} more name(s) outside ${params.style}`,
      });
    }
    return { passed: false, evidence };
  },
};
