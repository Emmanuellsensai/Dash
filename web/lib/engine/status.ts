import type { ReviewStatus } from "../db";
import type { RuleResult } from "./types";

/**
 * Any failed required rule gives REDO. All required rules pass but a failed
 * advisory rule gives PASS_WITH_FIXES. Everything passing gives PASS.
 */
export function computeStatus(results: RuleResult[]): ReviewStatus {
  if (results.some((r) => r.severity === "required" && !r.passed)) return "REDO";
  if (results.some((r) => r.severity === "advisory" && !r.passed)) return "PASS_WITH_FIXES";
  return "PASS";
}
