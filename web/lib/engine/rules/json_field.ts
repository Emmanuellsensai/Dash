import { z } from "zod";
import { lineColumnAt } from "../parse";
import type { RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  jsonPath: z.string().min(1),
  equals: z.unknown().optional(),
});

type Params = z.infer<typeof paramsSchema>;

function stripJsonComments(input: string): string {
  let out = "";
  let i = 0;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < input.length) {
    const c = input[i];
    const next = input[i + 1];
    if (inLineComment) {
      if (c === "\n") {
        inLineComment = false;
        out += c;
      }
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      if (c === "\n") out += c;
      i++;
      continue;
    }
    if (inString) {
      out += c;
      if (c === "\\" && i + 1 < input.length) {
        out += input[i + 1];
        i += 2;
        continue;
      }
      if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function parseJson(content: string): unknown | undefined {
  try {
    return JSON.parse(content);
  } catch {
    // retry with comments and trailing commas stripped (JSONC style files)
  }
  try {
    return JSON.parse(stripJsonComments(content).replace(/,(\s*[}\]])/g, "$1"));
  } catch {
    return undefined;
  }
}

function resolvePath(data: unknown, jsonPath: string): { found: boolean; value?: unknown } {
  let cur: unknown = data;
  for (const segment of jsonPath.split(".")) {
    if (!segment) continue;
    if (cur === null || typeof cur !== "object") return { found: false };
    cur = (cur as Record<string, unknown>)[segment];
    if (cur === undefined) return { found: false };
  }
  return { found: true, value: cur };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) =>
        deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
      )
    );
  }
  return false;
}

function lineOfKey(content: string, jsonPath: string): { line: number; column: number } {
  const last = jsonPath.split(".").pop() ?? jsonPath;
  const offset = content.indexOf(`"${last}"`);
  if (offset === -1) return { line: 0, column: 0 };
  return lineColumnAt(content, offset);
}

export const jsonField: RuleModule<Params> = {
  id: "json_field",
  label: "JSON field",
  needsParse: false,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const jsonFiles = ctx.files.filter((f) => /\.json$/i.test(f.path));
    if (jsonFiles.length === 0) {
      return {
        passed: false,
        evidence: [
          {
            file: ctx.rule.file_pattern,
            line: 0,
            column: 0,
            detail: "No JSON file among the matched files",
          },
        ],
      };
    }

    const evidence = [];
    for (const file of jsonFiles) {
      const data = parseJson(file.content);
      if (data === undefined) {
        evidence.push({
          file: file.path,
          line: 0,
          column: 0,
          detail: "File is not valid JSON",
        });
        continue;
      }
      const resolved = resolvePath(data, params.jsonPath);
      if (!resolved.found) {
        evidence.push({
          file: file.path,
          line: 0,
          column: 0,
          detail: `Path ${params.jsonPath} not found in this file`,
        });
        continue;
      }
      if (params.equals !== undefined && !deepEqual(resolved.value, params.equals)) {
        const loc = lineOfKey(file.content, params.jsonPath);
        evidence.push({
          file: file.path,
          line: loc.line,
          column: loc.column,
          detail: `Path ${params.jsonPath} is ${JSON.stringify(resolved.value)}, expected ${JSON.stringify(params.equals)}`,
        });
      }
    }
    return { passed: evidence.length === 0, evidence };
  },
};
