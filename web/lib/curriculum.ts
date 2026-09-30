import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * curriculum.md lives at repo root's curriculum/curriculum.md. The web app
 * ships from web/ but Vercel bundles files referenced with path.join, so this
 * still works when the whole repo is deployed.
 */

const CURRICULUM_FILE = path.join(process.cwd(), "..", "curriculum", "curriculum.md");

let curriculumCache: string | null = null;

async function readCurriculum(): Promise<string> {
  if (curriculumCache) return curriculumCache;
  const p = process.env.CURRICULUM_PATH
    ? path.resolve(process.cwd(), process.env.CURRICULUM_PATH)
    : CURRICULUM_FILE;
  curriculumCache = await fs.readFile(p, "utf8");
  return curriculumCache;
}

/**
 * Pull the section for a given day out of curriculum.md.
 * Sections start with "### DAY N:" and end at the next "### DAY" or "---" barrier.
 */
export async function daySection(day: number): Promise<string | null> {
  const text = await readCurriculum();
  const start = text.search(new RegExp(`^###\\s+DAY\\s+${day}\\b`, "im"));
  if (start === -1) return null;
  const rest = text.slice(start);
  const nextDay = rest.slice(1).search(/^###\s+DAY\s+\d+\b/im);
  const end = nextDay === -1 ? rest.length : nextDay + 1;
  return rest.slice(0, end).trim();
}
