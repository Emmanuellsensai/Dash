/**
 * Fetch a student's day-N submission from a public GitHub repo.
 * Accepts URLs like:
 *   https://github.com/user/repo
 *   https://github.com/user/repo.git
 *   https://github.com/user/repo/tree/main/day1
 */

const MAX_TOTAL_BYTES = 40_000;
const MAX_FILES = 15;

type Parsed = { owner: string; repo: string };

export function parseRepo(url: string): Parsed | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== "github.com") return null;
    const [owner, repo] = u.pathname.replace(/^\//, "").split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

function ghHeaders() {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function defaultBranch(p: Parsed): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${p.owner}/${p.repo}`, {
    headers: ghHeaders(),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Repo not found or private (${res.status})`);
  const j = (await res.json()) as { default_branch: string };
  return j.default_branch || "main";
}

async function branchSha(p: Parsed, branch: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${p.owner}/${p.repo}/commits/${branch}`,
    { headers: ghHeaders(), next: { revalidate: 30 } },
  );
  if (!res.ok) throw new Error(`Branch ${branch} not found (${res.status})`);
  const j = (await res.json()) as { sha: string };
  return j.sha;
}

interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
}

async function fullTree(p: Parsed, treeSha: string): Promise<TreeEntry[]> {
  const res = await fetch(
    `https://api.github.com/repos/${p.owner}/${p.repo}/git/trees/${treeSha}?recursive=1`,
    { headers: ghHeaders(), next: { revalidate: 30 } },
  );
  if (!res.ok) throw new Error(`Could not read repo tree (${res.status})`);
  const j = (await res.json()) as { tree: TreeEntry[] };
  return j.tree ?? [];
}

async function blobText(p: Parsed, sha: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${p.owner}/${p.repo}/git/blobs/${sha}`,
    { headers: ghHeaders(), next: { revalidate: 30 } },
  );
  if (!res.ok) return "";
  const j = (await res.json()) as { content: string; encoding: string };
  if (j.encoding === "base64") return Buffer.from(j.content, "base64").toString("utf8");
  return j.content;
}

async function lastCommitForPath(
  p: Parsed,
  branch: string,
  path: string,
): Promise<{ sha: string; date: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${p.owner}/${p.repo}/commits?sha=${branch}&path=${encodeURIComponent(path)}&per_page=1`,
    { headers: ghHeaders(), next: { revalidate: 30 } },
  );
  if (!res.ok) return null;
  const j = (await res.json()) as Array<{ sha: string; commit: { committer: { date: string } } }>;
  if (!j.length) return null;
  return { sha: j[0].sha, date: j[0].commit.committer.date };
}

const CODE_EXT = /\.(js|ts|jsx|tsx|mjs|cjs|html|css|json|md)$/i;

/**
 * Pick the folder for day N. Tries: dayN, day-N, weekX/dayN, week-X/day-N.
 * Falls back to any folder path segment matching /(^|\/)day[- ]?N(\/|$)/i.
 */
function pickDayPaths(tree: TreeEntry[], day: number): string[] {
  const wanted = new RegExp(`(^|/)day[- ]?${day}(/|$)`, "i");
  const dirs = new Set<string>();
  for (const e of tree) {
    if (e.type !== "blob") continue;
    const m = e.path.match(wanted);
    if (!m) continue;
    // grab the prefix up to and including "dayN"
    const idx = e.path.toLowerCase().indexOf(m[0].replace(/^\//, ""));
    const prefix = e.path.slice(0, idx + m[0].replace(/^\//, "").length).replace(/\/$/, "");
    dirs.add(prefix);
  }
  return [...dirs];
}

export interface FetchedSubmission {
  branch: string;
  branchSha: string;
  folderPath: string;
  files: { path: string; content: string }[];
  lastCommitSha: string | null;
  lastCommitDate: string | null;
  totalBytes: number;
  truncated: boolean;
}

export async function fetchDaySubmission(
  repoUrl: string,
  day: number,
): Promise<FetchedSubmission | { error: string }> {
  const p = parseRepo(repoUrl);
  if (!p) return { error: "Not a valid github.com repo URL." };
  const branch = await defaultBranch(p);
  const sha = await branchSha(p, branch);
  const tree = await fullTree(p, sha);
  const paths = pickDayPaths(tree, day);
  if (!paths.length) {
    return { error: `No folder for day ${day} found in ${p.owner}/${p.repo} (${branch}).` };
  }
  // Prefer the shortest matching path (i.e. flat "day3" over "week1/day3" if both exist)
  paths.sort((a, b) => a.length - b.length);
  const folderPath = paths[0];

  const entries = tree
    .filter((e) => e.type === "blob" && e.path.startsWith(folderPath + "/") && CODE_EXT.test(e.path))
    .slice(0, MAX_FILES);

  let total = 0;
  const files: { path: string; content: string }[] = [];
  let truncated = false;
  for (const e of entries) {
    const content = await blobText(p, e.sha);
    total += content.length;
    if (total > MAX_TOTAL_BYTES) {
      truncated = true;
      break;
    }
    files.push({ path: e.path, content });
  }

  const last = await lastCommitForPath(p, branch, folderPath);

  return {
    branch,
    branchSha: sha,
    folderPath,
    files,
    lastCommitSha: last?.sha ?? null,
    lastCommitDate: last?.date ?? null,
    totalBytes: total,
    truncated,
  };
}
