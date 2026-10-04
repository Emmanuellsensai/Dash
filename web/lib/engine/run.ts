import { minimatch } from "minimatch";
import { parseSource } from "./parse";
import { ruleModules } from "./registry";
import type { EngineDay, EngineFile } from "./context";
import type { RuleResult } from "./types";

export const ENGINE_VERSION = "1.0.0";

export interface RunFile {
  path: string;
  content: string;
}

export interface RunRule {
  id: number;
  type: string;
  severity: "required" | "advisory";
  file_pattern: string;
  params: Record<string, unknown>;
  message: string;
}

function runOne(files: EngineFile[], rule: RunRule, day: EngineDay): RuleResult {
  const base = {
    ruleId: rule.id,
    type: rule.type,
    severity: rule.severity,
    message: rule.message,
  };

  const mod = ruleModules[rule.type];
  if (!mod) {
    return {
      ...base,
      passed: false,
      evidence: [
        {
          file: rule.file_pattern,
          line: 0,
          column: 0,
          detail: `Unknown rule type "${rule.type}"`,
        },
      ],
    };
  }

  const matched = files.filter((f) => minimatch(f.path, rule.file_pattern, { dot: true }));
  if (matched.length === 0) {
    return {
      ...base,
      passed: false,
      evidence: [
        {
          file: rule.file_pattern,
          line: 0,
          column: 0,
          detail: `No file matching ${rule.file_pattern} was found`,
        },
      ],
    };
  }

  const parsedParams = mod.paramsSchema.safeParse(rule.params ?? {});
  if (!parsedParams.success) {
    const issues = parsedParams.error.issues
      .map((i) => `${i.path.join(".") || "params"}: ${i.message}`)
      .join("; ");
    return {
      ...base,
      passed: false,
      evidence: [
        {
          file: rule.file_pattern,
          line: 0,
          column: 0,
          detail: `Invalid params: ${issues}`,
        },
      ],
    };
  }

  if (mod.needsParse) {
    const broken = matched.filter((f) => f.parsed.error);
    if (broken.length > 0) {
      return {
        ...base,
        passed: false,
        evidence: broken.map((f) => {
          const error = f.parsed.error!;
          return {
            file: f.path,
            line: error.line,
            column: error.column,
            detail: `File has a syntax error at line ${error.line}, column ${error.column}`,
          };
        }),
      };
    }
  }

  const result = mod.evaluate(
    {
      files: matched,
      allFiles: files,
      day,
      rule: { message: rule.message, file_pattern: rule.file_pattern },
    },
    parsedParams.data,
  );

  return { ...base, passed: result.passed, evidence: result.evidence };
}

/**
 * Parse every file once, then run each rule against the files matching its
 * file_pattern. One result is returned per rule.
 */
export function runRules(files: RunFile[], rules: RunRule[], day: EngineDay): RuleResult[] {
  const engineFiles: EngineFile[] = files.map((f) => ({
    path: f.path,
    content: f.content,
    parsed: parseSource(f.path, f.content),
  }));
  return rules.map((rule) => runOne(engineFiles, rule, day));
}
