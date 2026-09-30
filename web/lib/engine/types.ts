export type RuleSeverity = "required" | "advisory";

export interface RuleEvidence {
  file: string;
  line: number;
  column: number;
  detail: string;
}

export interface RuleResult {
  ruleId: number;
  type: string;
  severity: RuleSeverity;
  passed: boolean;
  message: string;
  evidence: RuleEvidence[];
}
