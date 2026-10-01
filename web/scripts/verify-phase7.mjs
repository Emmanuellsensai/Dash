import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const REPO = "https://github.com/Emmanuellsensai/javascript/tree/master/DAY%201";
const DAY = 1;
const TITLE = "Values, types, coercion";
const STUDENT = "Emmanuellsensai";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const ADMIN_PASSWORD = env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD missing from .env.local");
  process.exit(1);
}

function log(label, value) {
  console.log(`${label}: ${value}`);
}

async function call(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
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

function fail(step, res) {
  console.error(`${step} FAILED: ${res.status} ${JSON.stringify(res.data)}`);
  process.exit(1);
}

const login = await call("/api/admin/login", {
  method: "POST",
  body: { password: ADMIN_PASSWORD },
});
if (login.status !== 200) fail("login", login);
const cookie = login.setCookie.split(";")[0];
log("login", "ok");

const curr = await call(`/api/admin/curriculum?day=${DAY}`);
if (curr.status !== 200) fail("curriculum import", curr);
log(
  "curriculum",
  `section ${curr.data.section.length} chars, filenames: ${curr.data.filenames.join(", ") || "none"}`,
);

const dayCreate = await call("/api/admin/days", {
  method: "POST",
  cookie,
  body: { day_number: DAY, title: TITLE },
});
if (dayCreate.status === 409) {
  console.error("Day already exists from a previous run. Clean it up in /admin first.");
  process.exit(1);
}
if (dayCreate.status !== 201) fail("create day", dayCreate);
log("day", `created day ${DAY}`);

const patch = await call(`/api/admin/days/${DAY}`, {
  method: "PATCH",
  cookie,
  body: { title: TITLE, requirements_md: curr.data.section, published: true },
});
if (patch.status !== 200) fail("patch day", patch);
log("day", "requirements imported and published");

const RULES = [
  {
    type: "file_exists",
    file_pattern: "**/*",
    params: { path: "experiments.js" },
    message: "The practice file experiments.js is missing.",
    severity: "required",
    enabled: true,
  },
  {
    type: "file_exists",
    file_pattern: "**/*",
    params: { path: "converter.js" },
    message: "The build file converter.js is missing.",
    severity: "required",
    enabled: true,
  },
  {
    type: "comment_contains",
    file_pattern: "experiments.js",
    params: { pattern: "SURPRISES", isRegex: false, min: 1 },
    message: "experiments.js does not contain the SURPRISES comment block.",
    severity: "required",
    enabled: true,
  },
  {
    type: "syntax_present",
    file_pattern: "experiments.js",
    params: { feature: "template_literal" },
    message: "No template literal found in experiments.js.",
    severity: "required",
    enabled: true,
  },
  {
    type: "syntax_present",
    file_pattern: "experiments.js",
    params: { feature: "typeof_operator" },
    message: "No typeof found in experiments.js.",
    severity: "required",
    enabled: true,
  },
  {
    type: "syntax_present",
    file_pattern: "**/*.js",
    params: { feature: "strict_equality" },
    message: "No strict equality (=== or !==) comparison found.",
    severity: "required",
    enabled: true,
  },
  {
    type: "syntax_forbidden",
    file_pattern: "**/*.js",
    params: { feature: "loose_equality" },
    message: "Loose equality (== or !=) found; day 1 expects === and !==.",
    severity: "required",
    enabled: true,
  },
  {
    type: "function_defined",
    file_pattern: "converter.js",
    params: { name: "nairaToUsd", mustReturnValue: true },
    message: "nairaToUsd is missing or does not return a value.",
    severity: "required",
    enabled: true,
  },
  {
    type: "function_defined",
    file_pattern: "converter.js",
    params: { name: "usdToNaira", mustReturnValue: true },
    message: "usdToNaira is missing or does not return a value.",
    severity: "required",
    enabled: true,
  },
  {
    type: "function_defined",
    file_pattern: "converter.js",
    params: { name: "celsiusToFahrenheit", mustReturnValue: true },
    message: "celsiusToFahrenheit is missing or does not return a value.",
    severity: "required",
    enabled: true,
  },
  {
    type: "function_defined",
    file_pattern: "converter.js",
    params: { name: "kgToPounds", mustReturnValue: true },
    message: "kgToPounds is missing or does not return a value.",
    severity: "required",
    enabled: true,
  },
  {
    type: "call_usage",
    file_pattern: "**/*.js",
    params: { callee: "console.log", where: "top_level", min: 1 },
    message: "No top level console.log found; day 1 logs results at the bottom of the file.",
    severity: "required",
    enabled: true,
  },
  {
    type: "call_usage",
    file_pattern: "**/*.js",
    params: { callee: "console.log", where: "inside_function", max: 0 },
    message: "console.log found inside a function; day 1 logs at the bottom of the file.",
    severity: "advisory",
    enabled: true,
  },
  {
    type: "naming_convention",
    file_pattern: "converter.js",
    params: { target: "function", style: "camelCase" },
    message: "A function name in converter.js is outside camelCase.",
    severity: "advisory",
    enabled: true,
  },
];

const created = [];
for (const rule of RULES) {
  const res = await call(`/api/admin/days/${DAY}/rules`, { method: "POST", cookie, body: rule });
  if (res.status !== 201) fail(`create rule ${rule.type} ${JSON.stringify(rule.params)}`, res);
  created.push(res.data.rule);
}
log("rules", `created ${created.length}`);

const dry = await call("/api/admin/dryrun", {
  method: "POST",
  cookie,
  body: {
    repo: REPO,
    day: { day_number: DAY, title: TITLE, requirements_md: curr.data.section },
    rules: created.map((r) => ({
      id: r.id,
      type: r.type,
      file_pattern: r.file_pattern,
      params: r.params,
      message: r.message,
      severity: r.severity,
      enabled: r.enabled,
    })),
    useGemini: true,
  },
});
if (dry.status !== 200) fail("dry run", dry);
const d = dry.data;
log(
  "dry run",
  `${d.status} in ${d.folderPath}: ${d.results.filter((r) => r.passed).length}/${d.results.length} passed, truncated=${d.truncated}`,
);
for (const r of d.results.filter((x) => !x.passed)) {
  const e = r.evidence[0];
  const where = e
    ? e.line > 0
      ? `${e.file} line ${e.line}: ${e.detail}`
      : `${e.file}: ${e.detail}`
    : "no evidence";
  log("  FAIL", `${r.type} [${r.severity}] ${r.message} | ${where}`);
}
log(
  "dry advisory",
  d.advisory ? `${d.advisory.status}${d.advisory.reason ? ` (${d.advisory.reason})` : ""}` : "null",
);

const sub = await call("/api/submit", {
  method: "POST",
  body: { name: STUDENT, repo: REPO, day: DAY },
});
if (sub.status !== 200) fail("submit", sub);
const review = sub.data.review;
log(
  "submit",
  `review ${review.id} status=${review.status} rules=${review.rule_results.length} advisory=${review.advisory?.status ?? "null"} cached=${Boolean(sub.data.cached)}`,
);

const pages = {};
for (const p of [`/review/${review.id}`, "/feed", "/leaderboard", "/", `/admin/days/${DAY}`]) {
  const res = await fetch(BASE + p, { headers: { Cookie: cookie } });
  pages[p] = res.status;
}
log("pages", JSON.stringify(pages));

const reviewHtml = await (await fetch(BASE + `/review/${review.id}`)).text();
log("review checklist", String(reviewHtml.includes("Rule checklist")));
log("review advisory section", String(reviewHtml.includes("Comments and naming notes")));
log(
  "review evidence line",
  String(/line \d+/.test(reviewHtml)),
);
const feedHtml = await (await fetch(BASE + "/feed")).text();
log("feed lists student", String(feedHtml.includes(STUDENT)));
const lbHtml = await (await fetch(BASE + "/leaderboard")).text();
log("leaderboard lists student", String(lbHtml.includes(STUDENT)));
const adminHtml = await (await fetch(BASE + "/admin", { headers: { Cookie: cookie } })).text();
log("admin lists day", String(adminHtml.includes(`Day ${DAY}`)));

console.log("DONE");
