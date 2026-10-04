import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "../../lib/engine/run";
import { run } from "./helpers";

describe("runRules", () => {
  it("fails a rule whose pattern matches no file", () => {
    const results = run(
      [{ path: "main.js", content: "const x = 1;" }],
      [{ type: "syntax_present", file_pattern: "**/*.css", params: { feature: "const_declaration" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toBe("No file matching **/*.css was found");
  });

  it("fails every parse needing rule on a file with a syntax error", () => {
    const results = run(
      [{ path: "broken.js", content: "const x = ;" }],
      [{ type: "syntax_present", params: { feature: "const_declaration" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].file).toBe("broken.js");
    expect(results[0].evidence[0].detail).toMatch(
      /File has a syntax error at line 1, column \d+/,
    );
  });

  it("still runs rules that do not need the AST when there is a syntax error", () => {
    const results = run(
      [{ path: "broken.js", content: "const x = ;" }],
      [{ type: "file_exists", params: { path: "broken.js" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails closed on unknown rule types", () => {
    const results = run(
      [{ path: "main.js", content: "const x = 1;" }],
      [{ type: "not_a_rule", params: {} }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain("Unknown rule type");
  });

  it("fails closed on params that do not match the schema", () => {
    const results = run(
      [{ path: "main.js", content: '"use strict";' }],
      [{ type: "directive", params: { where: "nowhere" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain("Invalid params");
  });

  it("returns one result per rule with the rule identity attached", () => {
    const results = run(
      [{ path: "main.js", content: '"use strict";\nconst x = 1;' }],
      [
        { type: "directive", severity: "required", params: { value: "use strict" } },
        { type: "syntax_present", severity: "advisory", message: "needs a template literal", params: { feature: "template_literal" } },
      ],
    );
    expect(results).toHaveLength(2);
    expect(results[0].ruleId).toBe(1);
    expect(results[0].severity).toBe("required");
    expect(results[0].passed).toBe(true);
    expect(results[1].ruleId).toBe(2);
    expect(results[1].severity).toBe("advisory");
    expect(results[1].message).toBe("needs a template literal");
    expect(results[1].passed).toBe(false);
  });

  it("exposes an engine version", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
