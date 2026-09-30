import { z } from "zod";
import { columnOf, isFunctionNode, lineOf, walk, type Node } from "../walk";
import type { EngineFile, RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  callee: z.string().min(1),
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(0).optional(),
  where: z.enum(["any", "top_level", "inside_function"]).default("any"),
});

type Params = z.infer<typeof paramsSchema>;

const MAX_EVIDENCE = 10;

function calleeName(node: Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "Identifier" && typeof node.name === "string") return node.name;
  if (node.type === "MemberExpression" && node.computed !== true) {
    const object = calleeName(node.object as Node);
    const property = node.property as Node;
    const prop =
      property.type === "Identifier" && typeof property.name === "string"
        ? property.name
        : null;
    if (object && prop) return `${object}.${prop}`;
  }
  return null;
}

const WHERE_LABEL = {
  any: "",
  top_level: " at top level",
  inside_function: " inside a function",
} as const;

export const callUsage: RuleModule<Params> = {
  id: "call_usage",
  label: "Call usage",
  needsParse: true,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const min = params.min ?? (params.max === undefined ? 1 : 0);
    const max = params.max ?? Infinity;
    const hits: { file: EngineFile; node: Node }[] = [];

    for (const file of ctx.files) {
      if (!file.parsed.ast) continue;
      walk(file.parsed.ast, (node, ancestors) => {
        if (node.type !== "CallExpression") return;
        if (calleeName(node.callee as Node) !== params.callee) return;
        const functionDepth = ancestors.filter(isFunctionNode).length;
        if (params.where === "top_level" && functionDepth > 0) return;
        if (params.where === "inside_function" && functionDepth === 0) return;
        hits.push({ file, node });
      });
    }

    if (hits.length < min) {
      return {
        passed: false,
        evidence: [
          {
            file: ctx.files[0]?.path ?? ctx.rule.file_pattern,
            line: 0,
            column: 0,
            detail: `Found ${hits.length} call(s) to ${params.callee}${WHERE_LABEL[params.where]}, expected at least ${min}`,
          },
        ],
      };
    }

    if (hits.length > max) {
      const evidence = hits.slice(0, MAX_EVIDENCE).map((h) => ({
        file: h.file.path,
        line: lineOf(h.node),
        column: columnOf(h.node),
        detail: `Call to ${params.callee} here, allowed maximum is ${max}`,
      }));
      if (hits.length > MAX_EVIDENCE) {
        evidence.push({
          file: hits[MAX_EVIDENCE].file.path,
          line: 0,
          column: 0,
          detail: `+${hits.length - MAX_EVIDENCE} more call(s) to ${params.callee}`,
        });
      }
      return { passed: false, evidence };
    }

    return { passed: true, evidence: [] };
  },
};
