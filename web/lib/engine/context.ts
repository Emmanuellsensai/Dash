import type { z } from "zod";
import type { ParsedFile } from "./parse";
import type { RuleEvidence } from "./types";

export interface EngineFile {
  path: string;
  content: string;
  parsed: ParsedFile;
}

export interface EngineDay {
  day_number: number;
  title: string;
  requirements_md: string;
}

export interface RuleContext {
  files: EngineFile[];
  allFiles: EngineFile[];
  day: EngineDay;
  rule: { message: string; file_pattern: string };
}

export interface RuleEvaluation {
  passed: boolean;
  evidence: RuleEvidence[];
}

export interface RuleModule<P = unknown> {
  id: string;
  label: string;
  needsParse: boolean;
  paramsSchema: z.ZodType<P>;
  evaluate(ctx: RuleContext, params: P): RuleEvaluation;
}

export type AnyRuleModule = {
  id: string;
  label: string;
  needsParse: boolean;
  paramsSchema: z.ZodTypeAny;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluate(ctx: RuleContext, params: any): RuleEvaluation;
};
