/**
 * Fetch a student's day-N submission from a public GitHub repo.
 * Accepts URLs like:
 *   https://github.com/user/repo
 *   https://github.com/user/repo.git
 *   https://github.com/user/repo/tree/main/day1
 */

const MAX_FILE_BYTES = 200 * 1024;
const MAX_TOTAL_BYTES = 1_572_864;
const MAX_FILES = 40;
const BLOB_CONCURRENCY = 5;

const CODE_EXT = /\.(m?js|cjs|tsx?|html|css|json|md)$/i;

interface TreePath {
  branch: string;
  folder: string;
}

type Parsed = { owner: string; repo: string; tree?: TreePath };

export function parseRepo(url: string): Parsed | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname
      .replace(/^\//, "")
      .split("/")
      .filter((p) => p.length > 0)
      .map((p) => decodeURIComponent(p));
    const [owner, repoRaw] = parts;
    if (!owner || !repoRaw) return null;
    const repo = repoRaw.replace(/\.git$/, "");
    if (parts[2] === "tree" && parts.length > 3) {
      return {
        owner,
        repo,
        tree: { branch: parts[3], folder: parts.slice(4).join("/") },
      };
    }
    return { owner, repo };
  } catch {
    return null;
  }
}

class RateLimitError extends Error {}

function ghHeaders() {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function ghGet(url: string, revalidate = 30): Promise<Response> {
  const res = await fetch(url, { headers: ghHeaders(), next: { revalidate } });
  if (res.status === 403 || res.status === 429) {
    throw new RateLimitError(
      "GitHub rate limit reached. Try again in a few minutes.",
    );
  }
  return res;
}

async function defaultBranch(p: Parsed): Promise<string> {
  const res = await ghGet(`https://api.github.com/repos/${p.owner}/${p.repo}`, 60);
  if (!res.ok) throw new Error(`Repo not found or private (${res.status})`);
  const j = (await res.json()) as { default_branch: string };
  return j.default_branch || "main";
}

async function branchExists(p: Parsed, branch: string): Promise<boolean> {
  const res = await ghGet(
    `https://api.github.com/repos/${p.owner}/${p.repo}/branches/${encodeURIComponent(branch)}`,
  );
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Could not read branch ${branch} (${res.status})`);
  return true;
}

async function branchSha(p: Parsed, branch: string): Promise<string> {
  const res = await ghGet(
    `https://api.github.com/repos/${p.owner}/${p.repo}/commits/${encodeURIComponent(branch)}`,
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
  const res = await ghGet(
    `https://api.github.com/repos/${p.owner}/${p.repo}/git/trees/${treeSha}?recursive=1`,
  );
  if (!res.ok) throw new Error(`Could not read repo tree (${res.status})`);
  const j = (await res.json()) as { tree: TreeEntry[] };
  return j.tree ?? [];
}

async function blobText(p: Parsed, sha: string): Promise<string> {
  const res = await ghGet(`https://api.github.com/repos/${p.owner}/${p.repo}/git/blobs/${sha}`);
  if (!res.ok) throw new Error(`Could not fetch a file from GitHub (${res.status})`);
  const j = (await res.json()) as { content: string; encoding: string };
  if (j.encoding === "base64") return Buffer.from(j.content, "base64").toString("utf8");
  return j.content;
}

async function lastCommitForPath(
  p: Parsed,
  branch: string,
  path: string,
): Promise<{ sha: string; date: string } | null> {
  const res = await ghGet(
    `https://api.github.com/repos/${p.owner}/${p.repo}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=1`,
  );
  if (!res.ok) return null;
  const j = (await res.json()) as Array<{ sha: string; commit: { committer: { date: string } } }>;
  if (!j.length) return null;
  return { sha: j[0].sha, date: j[0].commit.committer.date };
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Pick the folder for day N. Tries: dayN, day-N, weekX/dayN, week-X/day-N.
 * Falls back to any folder path segment matching /(^|/)day[- ]?N(\/|$)/i.
 */
function pickDayPaths(tree: TreeEntry[], day: number): string[] {
  const wanted = new RegExp(`(^|/)day[- ]?${day}(/|$)`, "i");
  const dirs = new Set<string>();
  for (const e of tree) {
    if (e.type !== "blob") continue;
    const m = e.path.match(wanted);
    if (!m) continue;
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
  skipped: string[];
}

async function resolveBranchAndFolder(
  p: Parsed,
): Promise<{ branch: string; folder: string | null }> {
  if (!p.tree) {
    return { branch: await defaultBranch(p), folder: null };
  }
  const branchIsExact = await branchExists(p, p.tree.branch);
  if (branchIsExact) {
    return { branch: p.tree.branch, folder: p.tree.folder || null };
  }
  // The tree path may contain a multi segment branch such as feature/x.
  const branch = await defaultBranch(p);
  const combined = [p.tree.branch, p.tree.folder].filter(Boolean).join("/");
  if (combined && combined !== branch) {
    return { branch, folder: combined };
  }
  return { branch, folder: p.tree.folder || null };
}

export async function fetchDaySubmission(
  repoUrl: string,
  day: number,
): Promise<FetchedSubmission | { error: string }> {
  try {
    return await fetchDaySubmissionInner(repoUrl, day);
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    return { error: e instanceof Error ? e.message : "GitHub fetch failed." };
  }
}

async function fetchDaySubmissionInner(
  repoUrl: string,
  day: number,
): Promise<FetchedSubmission | { error: string }> {
  const p = parseRepo(repoUrl);
  if (!p) return { error: "Not a valid github.com repo URL." };

  const { branch, folder: explicitFolder } = await resolveBranchAndFolder(p);
  const sha = await branchSha(p, branch);
  const tree = await fullTree(p, sha);

  let folderPath = explicitFolder;
  if (!folderPath) {
    const paths = pickDayPaths(tree, day);
    if (!paths.length) {
      return { error: `No folder for day ${day} found in ${p.owner}/${p.repo} (${branch}).` };
    }
    paths.sort((a, b) => a.length - b.length);
    folderPath = paths[0];
  }

  const candidates = tree.filter(
    (e) => e.type === "blob" && e.path.startsWith(folderPath + "/") && CODE_EXT.test(e.path),
  );
  if (!candidates.length) {
    return { error: `No code files found in ${folderPath} on ${branch}.` };
  }

  const selected: TreeEntry[] = [];
  const skipped: string[] = [];
  for (const e of candidates) {
    if (selected.length >= MAX_FILES || (e.size ?? 0) > MAX_FILE_BYTES) {
      skipped.push(e.path);
      continue;
    }
    selected.push(e);
  }

  const fetched = await mapLimit(selected, BLOB_CONCURRENCY, async (e) => ({
    entry: e,
    content: await blobText(p, e.sha),
  }));

  let totalBytes = 0;
  const files: { path: string; content: string }[] = [];
  for (const { entry, content } of fetched) {
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > MAX_FILE_BYTES || totalBytes + bytes > MAX_TOTAL_BYTES) {
      skipped.push(entry.path);
      continue;
    }
    totalBytes += bytes;
    files.push({ path: entry.path.slice(folderPath.length + 1), content });
  }

  if (!files.length) {
    return { error: `No code files could be loaded from ${folderPath}.` };
  }

  const last = await lastCommitForPath(p, branch, folderPath);

  return {
    branch,
    branchSha: sha,
    folderPath,
    files,
    lastCommitSha: last?.sha ?? null,
    lastCommitDate: last?.date ?? null,
    totalBytes,
    truncated: skipped.length > 0,
    skipped,
  };
}
