import { z } from "zod";
import { minimatch } from "minimatch";
import type { RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  path: z.string().min(1, "path is required"),
});

type Params = z.infer<typeof paramsSchema>;

function isGlob(pattern: string): boolean {
  return /[*?[\]{}]/.test(pattern);
}

export const fileExists: RuleModule<Params> = {
  id: "file_exists",
  label: "File exists",
  needsParse: false,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const target = params.path.replace(/^\.\//, "");
    const found = ctx.allFiles.some((f) =>
      isGlob(target) ? minimatch(f.path, target, { dot: true }) : f.path === target,
    );
    if (found) return { passed: true, evidence: [] };
    return {
      passed: false,
      evidence: [
        {
          file: target,
          line: 0,
          column: 0,
          detail: `No file matching ${target} was found in the day folder`,
        },
      ],
    };
  },
};
