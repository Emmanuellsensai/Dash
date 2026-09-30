import { z } from "zod";
import { columnOf, lineOf, walk, type Node } from "../walk";
import type { EngineFile, RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["any", "declaration", "arrow", "method"]).default("any"),
  minParams: z.number().int().min(0).optional(),
  maxParams: z.number().int().min(0).optional(),
  mustReturnValue: z.boolean().default(false),
});

type Params = z.infer<typeof paramsSchema>;

interface Definition {
  node: Node;
  params: Node[];
  body: unknown;
}

function keyName(key: unknown): string | null {
  if (!key || typeof key !== "object") return null;
  const k = key as Node;
  if (k.type === "Identifier" && typeof k.name === "string") return k.name;
  if (k.type === "Literal" && typeof k.value === "string") return k.value;
  return null;
}

function definitions(ast: Node, name: string, kind: string): Definition[] {
  const defs: Definition[] = [];
  walk(ast, (node) => {
    if (node.type === "FunctionDeclaration") {
      if (kind !== "any" && kind !== "declaration") return;
      const id = node.id as Node | null;
      if (id && id.type === "Identifier" && id.name === name) {
        defs.push({ node, params: (node.params ?? []) as Node[], body: node.body });
      }
      return;
    }
    if (node.type === "VariableDeclarator") {
      if (kind !== "any" && kind !== "arrow") return;
      const id = node.id as Node | undefined;
      const init = node.init as Node | null | undefined;
      if (!id || id.type !== "Identifier" || id.name !== name || !init) return;
      if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
        defs.push({ node: init, params: (init.params ?? []) as Node[], body: init.body });
      }
      return;
    }
    if (node.type === "MethodDefinition" || node.type === "Property" || node.type === "PropertyDefinition") {
      if (kind !== "any" && kind !== "method") return;
      if (keyName(node.key) !== name) return;
      const value = (node.value ?? node) as Node;
      if (
        value.type === "FunctionExpression" ||
        value.type === "ArrowFunctionExpression" ||
        value.type === "BlockStatement"
      ) {
        defs.push({
          node: value.type === "BlockStatement" ? node : value,
          params: ((value.params ?? node.params ?? []) as Node[]) ?? [],
          body: value.body ?? node.body,
        });
      }
    }
  });
  return defs;
}

function returnsValue(def: Definition): boolean {
  if (!def.body || typeof def.body !== "object") return false;
  const body = def.body as Node;
  if (body.type !== "BlockStatement") return true;
  let found = false;
  walk(body, (node) => {
    if (node.type === "ReturnStatement" && node.argument != null) found = true;
  });
  return found;
}

export const functionDefined: RuleModule<Params> = {
  id: "function_defined",
  label: "Function defined",
  needsParse: true,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const found: { file: EngineFile; def: Definition }[] = [];
    for (const file of ctx.files) {
      if (!file.parsed.ast) continue;
      for (const def of definitions(file.parsed.ast, params.name, params.kind)) {
        found.push({ file, def });
      }
    }

    if (found.length === 0) {
      return {
        passed: false,
        evidence: [
          {
            file: ctx.files[0]?.path ?? ctx.rule.file_pattern,
            line: 0,
            column: 0,
            detail:
              params.kind === "any"
                ? `Function ${params.name} not found`
                : `Function ${params.name} not found with kind ${params.kind}`,
          },
        ],
      };
    }

    const evidence = [];
    for (const { file, def } of found) {
      const count = def.params.length;
      const loc = { file: file.path, line: lineOf(def.node), column: columnOf(def.node) };
      if (params.minParams !== undefined && count < params.minParams) {
        evidence.push({
          ...loc,
          detail: `Function ${params.name} has ${count} parameter(s), expected at least ${params.minParams}`,
        });
      }
      if (params.maxParams !== undefined && count > params.maxParams) {
        evidence.push({
          ...loc,
          detail: `Function ${params.name} has ${count} parameter(s), expected at most ${params.maxParams}`,
        });
      }
      if (params.mustReturnValue && !returnsValue(def)) {
        evidence.push({
          ...loc,
          detail: `Function ${params.name} does not return a value`,
        });
      }
    }
    return { passed: evidence.length === 0, evidence };
  },
};
