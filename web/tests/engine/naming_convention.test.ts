import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("naming_convention", () => {
  it("passes when variables are camelCase", () => {
    const results = run(
      [{ path: "main.js", content: "let myVar = 1;" }],
      [{ type: "naming_convention", params: { target: "variable", style: "camelCase" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails with line evidence when a variable name is outside the style", () => {
    const results = run(
      [{ path: "main.js", content: "let myVar = 1;\nlet MyVar = 2;" }],
      [{ type: "naming_convention", params: { target: "variable", style: "camelCase" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].line).toBe(2);
    expect(results[0].evidence[0].detail).toBe('Name "MyVar" does not match camelCase');
  });

  it("checks function names", () => {
    const results = run(
      [{ path: "main.js", content: "function myFn() {}" }],
      [{ type: "naming_convention", params: { target: "function", style: "PascalCase" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain('"myFn"');
  });

  it("checks class names", () => {
    const pass = run(
      [{ path: "main.js", content: "class Car {}\nclass Boat {}" }],
      [{ type: "naming_convention", params: { target: "class", style: "PascalCase" } }],
    );
    expect(pass[0].passed).toBe(true);

    const fail = run(
      [{ path: "main.js", content: "class car {}" }],
      [{ type: "naming_convention", params: { target: "class", style: "PascalCase" } }],
    );
    expect(fail[0].passed).toBe(false);
  });

  it("checks constants in UPPER_SNAKE", () => {
    const pass = run(
      [{ path: "main.js", content: "const MAX_SIZE = 10;" }],
      [{ type: "naming_convention", params: { target: "constant", style: "UPPER_SNAKE" } }],
    );
    expect(pass[0].passed).toBe(true);

    const fail = run(
      [{ path: "main.js", content: "const maxSize = 10;" }],
      [{ type: "naming_convention", params: { target: "constant", style: "UPPER_SNAKE" } }],
    );
    expect(fail[0].passed).toBe(false);
  });

  it("ignores variables outside the target", () => {
    const results = run(
      [{ path: "main.js", content: "const MyConst = 1;" }],
      [{ type: "naming_convention", params: { target: "variable", style: "camelCase" } }],
    );
    expect(results[0].passed).toBe(true);
  });
});
