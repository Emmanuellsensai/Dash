import { describe, expect, it } from "vitest";
import { computeStatus } from "../../lib/engine/status";
import type { RuleResult } from "../../lib/engine/types";

function result(severity: "required" | "advisory", passed: boolean): RuleResult {
  return { ruleId: 1, type: "syntax_present", severity, passed, message: "", evidence: [] };
}

describe("computeStatus", () => {
  it("gives PASS when everything passes", () => {
    expect(computeStatus([result("required", true), result("advisory", true)])).toBe("PASS");
  });

  it("gives PASS_WITH_FIXES when only an advisory rule fails", () => {
    expect(computeStatus([result("required", true), result("advisory", false)])).toBe(
      "PASS_WITH_FIXES",
    );
  });

  it("gives REDO when a required rule fails", () => {
    expect(computeStatus([result("required", false), result("advisory", true)])).toBe("REDO");
  });

  it("gives REDO when both kinds fail", () => {
    expect(computeStatus([result("required", false), result("advisory", false)])).toBe("REDO");
  });

  it("gives PASS for an empty rule list", () => {
    expect(computeStatus([])).toBe("PASS");
  });
});
