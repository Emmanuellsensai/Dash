import { z } from "zod";
import { FEATURES, FEATURE_NAMES, countFeature } from "../features";
import type { RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  feature: z.enum(FEATURE_NAMES as [string, ...string[]]),
  min: z.number().int().min(0).optional(),
});

type Params = z.infer<typeof paramsSchema>;

const MAX_EVIDENCE = 10;

export const syntaxPresent: RuleModule<Params> = {
  id: "syntax_present",
  label: "Syntax present",
  needsParse: true,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const feature = FEATURES[params.feature];
    const min = params.min ?? 1;
    const perFile = ctx.files.map((f) => countFeature(f.parsed.ast, feature));
    const total = perFile.reduce((a, b) => a + b, 0);
    if (total >= min) return { passed: true, evidence: [] };

    const evidence = [];
    const missing = ctx.files.filter((_, i) => perFile[i] === 0);
    if (missing.length > 0) {
      for (const f of missing.slice(0, MAX_EVIDENCE)) {
        evidence.push({
          file: f.path,
          line: 0,
          column: 0,
          detail: `No ${feature.label} found in this file`,
        });
      }
      if (missing.length > MAX_EVIDENCE) {
        evidence.push({
          file: missing[MAX_EVIDENCE].path,
          line: 0,
          column: 0,
          detail: `+${missing.length - MAX_EVIDENCE} more file(s) without ${feature.label}`,
        });
      }
    } else {
      evidence.push({
        file: ctx.files[0].path,
        line: 0,
        column: 0,
        detail: `Found ${total} occurrence(s) of ${feature.label}, expected at least ${min}`,
      });
    }
    return { passed: false, evidence };
  },
};
