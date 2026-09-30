import { runRules, type RunFile, type RunRule } from "../../lib/engine/run";
import type { RuleResult } from "../../lib/engine/types";

export const DAY = { day_number: 1, title: "Day 1", requirements_md: "" };

export type RuleInput = Partial<Omit<RunRule, "id">> & { type: string };

export function run(files: RunFile[], rules: RuleInput[]): RuleResult[] {
  const full = rules.map((r, i): RunRule => {
    return {
      id: i + 1,
      severity: "required",
      file_pattern: "**/*",
      params: {},
      message: "Rule not satisfied",
      ...r,
    };
  });
  return runRules(files, full, DAY);
}
