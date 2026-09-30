import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("directive", () => {
  it("passes when use strict is at the top of the file", () => {
    const results = run(
      [{ path: "main.js", content: '"use strict";\nconst x = 1;' }],
      [{ type: "directive", params: { value: "use strict", where: "top_of_file" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails with the missing directive location when it is absent", () => {
    const results = run(
      [{ path: "main.js", content: "const x = 1;" }],
      [{ type: "directive", params: { value: "use strict", where: "top_of_file" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].file).toBe("main.js");
    expect(results[0].evidence[0].line).toBe(1);
    expect(results[0].evidence[0].detail).toContain('"use strict"');
  });

  it("fails a module file unless acceptModuleSyntax is on", () => {
    const files = [{ path: "main.js", content: 'import { x } from "./x.js";\nconsole.log(x);' }];
    const strict = run(files, [
      { type: "directive", params: { value: "use strict", where: "top_of_file" } },
    ]);
    expect(strict[0].passed).toBe(false);

    const lenient = run(files, [
      {
        type: "directive",
        params: { value: "use strict", where: "top_of_file", acceptModuleSyntax: true },
      },
    ]);
    expect(lenient[0].passed).toBe(true);
  });

  it("checks any function when where is any_function", () => {
    const files = [
      { path: "main.js", content: 'function f() {\n  "use strict";\n  return 1;\n}' },
    ];
    const inFunction = run(files, [
      { type: "directive", params: { value: "use strict", where: "any_function" } },
    ]);
    expect(inFunction[0].passed).toBe(true);

    const atTop = run(files, [
      { type: "directive", params: { value: "use strict", where: "top_of_file" } },
    ]);
    expect(atTop[0].passed).toBe(false);
  });

  it("works on TypeScript files", () => {
    const results = run(
      [{ path: "app.ts", content: '"use strict";\nconst x: number = 1;' }],
      [{ type: "directive", params: { value: "use strict", where: "top_of_file" } }],
    );
    expect(results[0].passed).toBe(true);
  });
});
