import { describe, expect, it } from "vitest";
import { run } from "./helpers";

const HTML = `<!doctype html>
<html>
  <body>
    <script src="guess.js"></script>
  </body>
</html>
`;

describe("html_has", () => {
  it("passes when the element with attribute and value exists", () => {
    const results = run(
      [{ path: "guess.html", content: HTML }],
      [
        {
          type: "html_has",
          file_pattern: "**/*.html",
          params: { tag: "script", attr: "src", value: "guess.js" },
        },
      ],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails with detail when the element is missing", () => {
    const results = run(
      [{ path: "guess.html", content: "<html><body></body></html>" }],
      [{ type: "html_has", file_pattern: "**/*.html", params: { tag: "script" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].file).toBe("guess.html");
    expect(results[0].evidence[0].detail).toBe("No <script> element found");
  });

  it("fails when the attribute value differs", () => {
    const results = run(
      [{ path: "guess.html", content: HTML }],
      [
        {
          type: "html_has",
          file_pattern: "**/*.html",
          params: { tag: "script", attr: "src", value: "other.js" },
        },
      ],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain('src="other.js"');
  });

  it("fails when no HTML file matched", () => {
    const results = run(
      [{ path: "main.js", content: "const x = 1;" }],
      [{ type: "html_has", params: { tag: "script" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toBe("No HTML file among the matched files");
  });
});
