import { describe, expect, it } from "vitest";
import { describeParams, ruleModules } from "../../lib/engine/registry";

describe("registry", () => {
  it("registers every rule type exactly once", () => {
    expect(Object.keys(ruleModules).sort()).toEqual(
      [
        "call_usage",
        "comment_contains",
        "directive",
        "file_exists",
        "function_defined",
        "html_has",
        "identifier_declared",
        "json_field",
        "naming_convention",
        "syntax_forbidden",
        "syntax_present",
      ].sort(),
    );
    const ids = Object.values(ruleModules).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("describes directive params for a form", () => {
    const fields = describeParams(ruleModules.directive.paramsSchema);
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    expect(byName.value.kind).toBe("string");
    expect(byName.where.kind).toBe("enum");
    expect(byName.where.options).toEqual(["top_of_file", "any_function"]);
    expect(byName.acceptModuleSyntax.kind).toBe("boolean");
    expect(byName.value.required).toBe(false);
  });

  it("describes the params of every registered rule type without throwing", () => {
    for (const mod of Object.values(ruleModules)) {
      expect(mod.label.length).toBeGreaterThan(0);
      const fields = describeParams(mod.paramsSchema);
      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) {
        expect(field.name.length).toBeGreaterThan(0);
        expect(["string", "number", "boolean", "enum", "json"]).toContain(field.kind);
      }
    }
  });
});
