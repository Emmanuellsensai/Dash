import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const REPO = "https://github.com/Emmanuellsensai/javascript/tree/master/DAY%201";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const ADMIN_PASSWORD = env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
const MODEL = env.match(/^GEMINI_MODEL=(.*)$/m)?.[1]?.trim();
console.log(`model: ${MODEL}`);

async function call(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}

const login = await call("/api/admin/login", { method: "POST", body: { password: ADMIN_PASSWORD } });
if (login.status !== 200) {
  console.error(`login FAILED: ${login.status}`);
  process.exit(1);
}
const cookie = login.setCookie.split(";")[0];

const rules = [
  { id: 1, type: "file_exists", file_pattern: "**/*", params: { path: "experiment.js" }, message: "m", severity: "required", enabled: true },
  { id: 2, type: "file_exists", file_pattern: "**/*", params: { path: "conveter.js" }, message: "m", severity: "required", enabled: true },
  { id: 3, type: "comment_contains", file_pattern: "experiment.js", params: { pattern: "SURPRISES", isRegex: false, min: 1 }, message: "m", severity: "required", enabled: true },
  { id: 12, type: "call_usage", file_pattern: "**/*.js", params: { callee: "console.log", where: "top_level", min: 1 }, message: "m", severity: "required", enabled: true },
];

let d = null;
for (let attempt = 1; attempt <= 4; attempt++) {
  const started = Date.now();
  const dry = await call("/api/admin/dryrun", {
    method: "POST",
    cookie,
    body: {
      repo: REPO,
      day: { day_number: 1, title: "Values, types, coercion", requirements_md: "" },
      rules,
      useGemini: true,
    },
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (dry.status !== 200) {
    console.error(`dry run FAILED: ${dry.status} ${JSON.stringify(dry.data)}`);
    process.exit(1);
  }
  d = dry.data;
  const st = d.advisory?.status;
  console.log(`attempt ${attempt}: advisory ${st}, ${seconds}s`);
  if (st === "ok") break;
  if (attempt < 4) {
    console.log(`  reason: ${d.advisory?.reason ?? "none"}, waiting 20s before retry`);
    await new Promise((r) => setTimeout(r, 20_000));
  }
}

const a = d.advisory;
if (!a) {
  console.error("advisory: null (useGemini did not reach generateAdvisory)");
  process.exit(1);
}
console.log(`advisory status: ${a.status}${a.reason ? ` (${a.reason})` : ""}`);
console.log(`findings returned: ${Array.isArray(a.findings) ? a.findings.length : "not an array"}`);

const FIX = /\b(should|try|instead|replace|rename|change to|consider|use a|add a|remove the|you could|better to)\b/i;
let violations = 0;
for (const f of a.findings ?? []) {
  const bad =
    !["comments", "naming"].includes(f.category) ||
    !["note", "issue"].includes(f.severity) ||
    !Number.isInteger(f.line) ||
    f.line < 1 ||
    f.problem.includes("`") ||
    FIX.test(f.problem);
  if (bad) violations++;
  console.log(
    `  [${bad ? "INVALID" : "valid"}] ${f.category}/${f.severity} ${f.file}:${f.line} ${f.problem}`,
  );
}
console.log(violations === 0 ? "filter compliance: all findings clean" : `filter compliance: ${violations} invalid findings`);
