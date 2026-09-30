import type { AdvisoryFinding } from "./db";

const MAX_FINDINGS = 8;
const MAX_PROBLEM_LENGTH = 200;

const FIX_LANGUAGE = [
  /\bshould\b/i,
  /\btry\b/i,
  /\binstead\b/i,
  /\breplace\b/i,
  /\brename\b/i,
  /\bchange to\b/i,
  /\bconsider\b/i,
  /\buse a\b/i,
  /\badd a\b/i,
  /\bremove the\b/i,
  /\byou could\b/i,
  /\bbetter to\b/i,
];

const CATEGORIES = new Set(["comments", "naming"]);
const SEVERITIES = new Set(["note", "issue"]);

function isUsableProblem(problem: string): boolean {
  if (!problem) return false;
  if (problem.includes("`")) return false;
  return !FIX_LANGUAGE.some((pattern) => pattern.test(problem));
}

/**
 * Drop findings with a line that does not exist in the named file, fix style
 * language, backticks or code fences, or invalid fields. Dedupe and cap the
 * list. Returns an empty list when nothing valid remains.
 */
export function filterFindings(
  findings: unknown,
  lineCounts: Map<string, number>,
): AdvisoryFinding[] {
  if (!Array.isArray(findings)) return [];
  const seen = new Set<string>();
  const out: AdvisoryFinding[] = [];

  for (const raw of findings) {
    if (out.length >= MAX_FINDINGS) break;
    if (typeof raw !== "object" || raw === null) continue;
    const f = raw as Record<string, unknown>;

    if (typeof f.category !== "string" || !CATEGORIES.has(f.category)) continue;
    if (typeof f.severity !== "string" || !SEVERITIES.has(f.severity)) continue;
    if (typeof f.file !== "string") continue;

    const lineCount = lineCounts.get(f.file);
    const line = typeof f.line === "number" ? f.line : NaN;
    if (lineCount === undefined || !Number.isInteger(line)) continue;
    if (line < 1 || line > lineCount) continue;

    if (typeof f.problem !== "string") continue;
    const problem = f.problem.trim().slice(0, MAX_PROBLEM_LENGTH);
    if (!isUsableProblem(problem)) continue;

    const key = `${f.category}|${f.file}|${line}|${problem}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      category: f.category as AdvisoryFinding["category"],
      file: f.file,
      line,
      severity: f.severity as AdvisoryFinding["severity"],
      problem,
    });
  }
  return out;
}
