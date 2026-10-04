import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("file_exists", () => {
  it("passes when the file is present", () => {
    const results = run(
      [{ path: "converter.js", content: "const x = 1;" }],
      [{ type: "file_exists", params: { path: "converter.js" } }],
    );
    expect(results[0].passed).toBe(true);
    expect(results[0].evidence).toEqual([]);
  });

  it("fails with evidence when the file is missing", () => {
    const results = run(
      [{ path: "converter.js", content: "const x = 1;" }],
      [{ type: "file_exists", params: { path: "drills.js" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain("drills.js");
  });

  it("supports glob paths", () => {
    const results = run(
      [
        { path: "styles.css", content: "body {}" },
        { path: "main.js", content: "const x = 1;" },
      ],
      [{ type: "file_exists", params: { path: "*.css" } }],
    );
    expect(results[0].passed).toBe(true);
  });
});
