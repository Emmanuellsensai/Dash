import type { Advisory, ReviewStatus } from "./db";
import type { RuleEvidence, RuleResult } from "./engine/types";

export function formatEvidence(e: RuleEvidence): string {
  if (e.line > 0) return `${e.file}, line ${e.line}: ${e.detail}`;
  return `${e.file}: ${e.detail}`;
}

export function buildSummary(
  results: RuleResult[],
  status: ReviewStatus,
  advisory: Advisory | null,
): string {
  const passed = results.filter((r) => r.passed).length;
  const lines = [`${status.replace(/_/g, " ")} · ${passed} of ${results.length} rules passed.`];

  const failed = results.filter((r) => !r.passed);
  for (const r of failed.slice(0, 10)) {
    const where = r.evidence[0] ? ` (${formatEvidence(r.evidence[0])})` : "";
    lines.push(`Failed: ${r.message}${where}`);
  }
  if (failed.length > 10) {
    lines.push(`Failed: ${failed.length - 10} more rule(s).`);
  }

  const notes = advisory?.status === "ok" ? advisory.findings?.length ?? 0 : 0;
  if (notes > 0) {
    lines.push(
      `Advisory: ${notes} comment and naming note(s), not counted in the status.`,
    );
  }
  if (advisory?.status === "skipped" || advisory?.status === "unavailable") {
    lines.push(`Advisory not available: ${advisory.reason ?? "unknown reason"}.`);
  }
  return lines.join("\n");
}
