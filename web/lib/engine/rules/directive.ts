import { z } from "zod";
import { walk, type Node } from "../walk";
import type { RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  value: z.string().min(1).default("use strict"),
  where: z.enum(["top_of_file", "any_function"]).default("top_of_file"),
  acceptModuleSyntax: z.boolean().default(false),
});

type Params = z.infer<typeof paramsSchema>;

const MODULE_TYPES = new Set([
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
  "ImportExpression",
]);

function isStringLiteralStatement(stmt: Node): boolean {
  if (stmt.type !== "ExpressionStatement") return false;
  const expr = stmt.expression as Node | undefined;
  return expr?.type === "Literal" && typeof expr.value === "string";
}

function bodyHasDirective(bodyNode: Node | null | undefined, value: string): boolean {
  if (!bodyNode) return false;
  if (bodyNode.type !== "BlockStatement" && bodyNode.type !== "Program") return false;
  const statements = bodyNode.body;
  if (!Array.isArray(statements)) return false;
  for (const raw of statements) {
    const stmt = raw as Node;
    if (stmt.type !== "ExpressionStatement") break;
    if (typeof stmt.directive === "string") {
      if (stmt.directive === value) return true;
      if (isStringLiteralStatement(stmt)) continue;
      break;
    }
    if (isStringLiteralStatement(stmt)) {
      const expr = stmt.expression as Node;
      if (expr.value === value) return true;
      continue;
    }
    break;
  }
  return false;
}

function candidateBodies(ast: Node, where: string): (Node | null | undefined)[] {
  if (where === "top_of_file") return [ast];
  const bodies: (Node | null | undefined)[] = [];
  walk(ast, (node) => {
    if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
      bodies.push(node.body as Node | null | undefined);
    }
  });
  return bodies;
}

function hasModuleSyntax(ast: Node): boolean {
  let found = false;
  walk(ast, (node) => {
    if (MODULE_TYPES.has(node.type)) found = true;
  });
  return found;
}

export const directive: RuleModule<Params> = {
  id: "directive",
  label: "Directive prologue",
  needsParse: true,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const evidence = [];
    for (const file of ctx.files) {
      const ast = file.parsed.ast;
      if (!ast) continue;
      const bodies = candidateBodies(ast, params.where);
      const hasDirective = bodies.some((b) => bodyHasDirective(b, params.value));
      if (hasDirective) continue;
      if (params.acceptModuleSyntax && hasModuleSyntax(ast)) continue;
      evidence.push({
        file: file.path,
        line: params.where === "top_of_file" ? 1 : 0,
        column: 0,
        detail:
          params.where === "top_of_file"
            ? `Missing directive "${params.value}" at the top of the file`
            : `No function with directive "${params.value}" found`,
      });
    }
    return { passed: evidence.length === 0, evidence };
  },
};
