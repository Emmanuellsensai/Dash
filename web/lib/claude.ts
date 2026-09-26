import Anthropic from "@anthropic-ai/sdk";
import { totalSpendCents } from "./db";
import type { ReviewStatus } from "./db";

if (!process.env.ANTHROPIC_API_KEY) {
  // Allow build without the key; runtime endpoints check.
}

// Haiku 4.5 pricing (USD per 1M tokens). Update if pricing changes.
const PRICE = {
  input: 1.0,
  cachedRead: 0.1,
  cacheWrite5m: 1.25,
  output: 5.0,
};
const MODEL = "claude-haiku-4-5-20251001";

export function estimateCostCents(
  inputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
  outputTokens: number,
): number {
  const usd =
    (inputTokens * PRICE.input +
      cacheReadTokens * PRICE.cachedRead +
      cacheWriteTokens * PRICE.cacheWrite5m +
      outputTokens * PRICE.output) /
    1_000_000;
  return Math.ceil(usd * 100);
}

export async function assertSpendCapNotHit() {
  const cap = Number(process.env.SPEND_CAP_CENTS ?? "500");
  const spent = await totalSpendCents();
  if (spent >= cap) {
    throw new Error(
      `Cohort spend cap reached (${(spent / 100).toFixed(2)} / ${(cap / 100).toFixed(2)} USD). Ask the teacher.`,
    );
  }
}

export interface ReviewResult {
  status: ReviewStatus;
  body: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costCents: number;
}

const SYSTEM_INTRO = `You are the automated code reviewer for a JavaScript-to-TypeScript cohort. Follow the rules and review format below exactly. Never invent APIs. Never rewrite the student's whole solution. Use the golden scope rule: only expect what has been taught by this day.`;

function buildFilesBlock(files: { path: string; content: string }[]): string {
  return files
    .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 8000)}`)
    .join("\n\n");
}

function parseStatus(body: string): ReviewStatus {
  const m = body.match(/^\s*STATUS:\s*(PASS WITH FIXES|PASS|REDO)/im);
  if (!m) return "REDO";
  const s = m[1].toUpperCase();
  if (s === "PASS") return "PASS";
  if (s === "REDO") return "REDO";
  return "PASS_WITH_FIXES";
}

export async function reviewSubmission(args: {
  rules: string;
  daySection: string;
  studentName: string;
  day: number;
  files: { path: string; content: string }[];
  folderPath: string;
  commitSha: string | null;
  commitDate: string | null;
  truncated: boolean;
}): Promise<ReviewResult> {
  await assertSpendCapNotHit();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const filesBlock = buildFilesBlock(args.files);
  const userText =
    `STUDENT: ${args.studentName}\nDAY: ${args.day}\nFOLDER: ${args.folderPath}\n` +
    `COMMIT: ${args.commitSha ?? "unknown"} on ${args.commitDate ?? "unknown"}\n` +
    (args.truncated ? "NOTE: submission was truncated to fit size limit.\n" : "") +
    `\nFILES:\n${filesBlock}\n\nProduce a review in the exact format specified in the system prompt.`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: [
      { type: "text", text: SYSTEM_INTRO },
      // Cached: the rules + this day's curriculum section (~10K tokens combined)
      {
        type: "text",
        text: `REVIEW RULES (CLAUDE.md):\n\n${args.rules}`,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: `CURRICULUM FOR DAY ${args.day}:\n\n${args.daySection}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userText }],
  });

  const body =
    resp.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim() || "(empty response)";
  const status = parseStatus(body);

  const u = resp.usage;
  const inTok = u.input_tokens ?? 0;
  const outTok = u.output_tokens ?? 0;
  const cacheRead = (u as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0;
  const cacheWrite = (u as { cache_creation_input_tokens?: number }).cache_creation_input_tokens ?? 0;
  const costCents = estimateCostCents(inTok, cacheRead, cacheWrite, outTok);

  return {
    status,
    body,
    model: MODEL,
    tokensInput: inTok + cacheRead + cacheWrite,
    tokensOutput: outTok,
    costCents,
  };
}
