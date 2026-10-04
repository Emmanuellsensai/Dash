import { z } from "zod";
import { FEATURES, FEATURE_NAMES, countFeature } from "../features";
import { columnOf, lineOf, walk, type Node } from "../walk";
import type { RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  feature: z.enum(FEATURE_NAMES as [string, ...string[]]),
  min: z.number().int().min(0).optional(),
});

type Params = z.infer<typeof paramsSchema>;

const MAX_EVIDENCE = 10;

export const syntaxForbidden: RuleModule<Params> = {
  id: "syntax_forbidden",
  label: "Syntax forbidden",
  needsParse: true,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const feature = FEATURES[params.feature];
    const min = params.min ?? 1;
    const hits: { path: string; node: Node }[] = [];
    for (const file of ctx.files) {
      if (!file.parsed.ast) continue;
      walk(file.parsed.ast, (node) => {
        if (feature.match(node)) hits.push({ path: file.path, node });
      });
    }
    if (hits.length < min) return { passed: true, evidence: [] };

    const evidence = hits.slice(0, MAX_EVIDENCE).map((h) => ({
      file: h.path,
      line: lineOf(h.node),
      column: columnOf(h.node),
      detail: `${feature.label} found here`,
    }));
    if (hits.length > MAX_EVIDENCE) {
      evidence.push({
        file: hits[MAX_EVIDENCE].path,
        line: 0,
        column: 0,
        detail: `+${hits.length - MAX_EVIDENCE} more occurrence(s) of ${feature.label}`,
      });
    }
    return { passed: false, evidence };
  },
};
