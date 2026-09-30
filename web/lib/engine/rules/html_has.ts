import { z } from "zod";
import { parse } from "parse5";
import type { RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z
  .object({
    tag: z.string().min(1),
    attr: z.string().min(1).optional(),
    value: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.value !== undefined && value.attr === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "value requires attr to be set",
        path: ["value"],
      });
    }
  });

type Params = z.infer<typeof paramsSchema>;

interface P5Node {
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: P5Node[];
  sourceCodeLocation?: { startLine: number; startCol: number };
}

function collect(node: P5Node, out: P5Node[] = []): P5Node[] {
  if (node.tagName) out.push(node);
  for (const child of node.childNodes ?? []) collect(child, out);
  return out;
}

function describe(params: Params): string {
  if (params.attr && params.value !== undefined) {
    return `No <${params.tag} ${params.attr}="${params.value}"> element found`;
  }
  if (params.attr) return `No <${params.tag} ${params.attr}> element found`;
  return `No <${params.tag}> element found`;
}

function matches(node: P5Node, params: Params): boolean {
  if (!node.tagName || node.tagName !== params.tag.toLowerCase()) return false;
  if (params.attr === undefined) return true;
  const attr = (node.attrs ?? []).find((a) => a.name === params.attr!.toLowerCase());
  if (!attr) return false;
  if (params.value !== undefined) return attr.value === params.value;
  return true;
}

export const htmlHas: RuleModule<Params> = {
  id: "html_has",
  label: "HTML element present",
  needsParse: false,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const htmlFiles = ctx.files.filter((f) => /\.html?$/i.test(f.path));
    if (htmlFiles.length === 0) {
      return {
        passed: false,
        evidence: [
          {
            file: ctx.rule.file_pattern,
            line: 0,
            column: 0,
            detail: "No HTML file among the matched files",
          },
        ],
      };
    }

    for (const file of htmlFiles) {
      const doc = parse(file.content, { sourceCodeLocationInfo: true }) as unknown as P5Node;
      if (collect(doc).some((node) => matches(node, params))) {
        return { passed: true, evidence: [] };
      }
    }

    return {
      passed: false,
      evidence: htmlFiles.map((f) => ({
        file: f.path,
        line: 0,
        column: 0,
        detail: describe(params),
      })),
    };
  },
};
