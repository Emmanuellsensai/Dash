import { parse as acornParse, type Options } from "acorn";
import { parse as tsParse } from "@typescript-eslint/typescript-estree";
import type { Node } from "./walk";

export interface ParsedComment {
  type: "Line" | "Block";
  value: string;
  line: number;
  column: number;
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

export interface ParsedFile {
  ast: Node | null;
  comments: ParsedComment[];
  error: ParseError | null;
}

const JS_EXT = /\.(m?js|cjs)$/i;
const TS_EXT = /\.tsx?$/i;

export function lineColumnAt(content: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(offset, content.length);
  for (let i = 0; i < end; i++) {
    if (content.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: end - lineStart };
}

function toParseError(e: unknown): ParseError {
  if (e && typeof e === "object") {
    const err = e as {
      message?: string;
      loc?: { line?: number; column?: number };
      lineNumber?: number;
      column?: number;
    };
    const line = err.loc?.line ?? err.lineNumber;
    const column = err.loc?.column ?? err.column;
    if (typeof line === "number") {
      return { line, column: column ?? 0, message: err.message ?? "Syntax error" };
    }
  }
  return { line: 1, column: 0, message: e instanceof Error ? e.message : "Syntax error" };
}

function parseJavaScript(content: string): ParsedFile {
  const comments: ParsedComment[] = [];
  const onComment: NonNullable<Options["onComment"]> = (
    block,
    text,
    start,
    _end,
    startLoc,
  ) => {
    const loc = startLoc ?? lineColumnAt(content, start);
    comments.push({
      type: block ? "Block" : "Line",
      value: text,
      line: loc.line,
      column: loc.column,
    });
  };

  const base: Options = {
    ecmaVersion: "latest",
    locations: true,
    allowHashBang: true,
    onComment,
  };

  let firstError: ParseError | null = null;
  for (const sourceType of ["module", "script"] as const) {
    try {
      const ast = acornParse(content, { ...base, sourceType }) as unknown as Node;
      return { ast, comments, error: null };
    } catch (e) {
      if (!firstError) firstError = toParseError(e);
      comments.length = 0;
    }
  }
  return { ast: null, comments: [], error: firstError };
}

interface TsComment {
  type: string;
  value: string;
  loc?: { start: { line: number; column: number } };
}

function parseTypeScript(path: string, content: string): ParsedFile {
  try {
    const program = tsParse(content, {
      loc: true,
      range: true,
      comment: true,
      jsx: /\.tsx$/i.test(path),
    }) as unknown as Node & { comments?: TsComment[] };
    const raw = Array.isArray(program.comments) ? program.comments : [];
    const comments: ParsedComment[] = raw.map((c) => ({
      type: c.type === "Block" ? "Block" : "Line",
      value: c.value,
      line: c.loc?.start.line ?? 0,
      column: c.loc?.start.column ?? 0,
    }));
    delete program.comments;
    return { ast: program, comments, error: null };
  } catch (e) {
    return { ast: null, comments: [], error: toParseError(e) };
  }
}

/**
 * Parse one submission file. JavaScript goes through acorn, TypeScript
 * through typescript-estree, both produce ESTree-compatible trees. Files
 * that are not code (html, css, json, md) get a null ast and no error.
 */
export function parseSource(path: string, content: string): ParsedFile {
  if (TS_EXT.test(path)) return parseTypeScript(path, content);
  if (JS_EXT.test(path)) return parseJavaScript(content);
  return { ast: null, comments: [], error: null };
}
