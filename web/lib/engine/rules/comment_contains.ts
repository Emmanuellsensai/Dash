import { z } from "zod";
import type { RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z
  .object({
    pattern: z.string().min(1),
    isRegex: z.boolean().default(false),
    min: z.number().int().min(1).default(1),
  })
  .superRefine((value, ctx) => {
    if (!value.isRegex) return;
    try {
      new RegExp(value.pattern);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "pattern is not a valid regular expression",
        path: ["pattern"],
      });
    }
  });

type Params = z.infer<typeof paramsSchema>;

function buildMatcher(params: Params): ((text: string) => boolean) | null {
  if (!params.isRegex) return (text) => text.includes(params.pattern);
  try {
    const re = new RegExp(params.pattern);
    return (text) => re.test(text);
  } catch {
    return null;
  }
}

export const commentContains: RuleModule<Params> = {
  id: "comment_contains",
  label: "Comment contains",
  needsParse: true,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const matcher = buildMatcher(params);
    if (!matcher) {
      return {
        passed: false,
        evidence: [
          {
            file: ctx.files[0]?.path ?? ctx.rule.file_pattern,
            line: 0,
            column: 0,
            detail: "pattern is not a valid regular expression",
          },
        ],
      };
    }

    let total = 0;
    for (const file of ctx.files) {
      for (const comment of file.parsed.comments) {
        if (matcher(comment.value)) total++;
      }
    }
    if (total >= params.min) return { passed: true, evidence: [] };

    return {
      passed: false,
      evidence: [
        {
          file: ctx.files[0]?.path ?? ctx.rule.file_pattern,
          line: 0,
          column: 0,
          detail: `Found ${total} matching comment(s), expected at least ${params.min}`,
        },
      ],
    };
  },
};
