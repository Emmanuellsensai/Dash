import { z } from "zod";
import { ruleModules } from "./engine/registry";

export const createDaySchema = z.object({
  day_number: z.number().int().min(1),
  title: z.string().trim().min(1),
  requirements_md: z.string().default(""),
  published: z.boolean().default(false),
});

export const updateDaySchema = createDaySchema.omit({ day_number: true }).partial();

export const useStrictSchema = z.object({
  enabled: z.boolean(),
});

export const ruleInputSchema = z.object({
  type: z.string().min(1),
  file_pattern: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
  message: z.string().trim().min(1),
  severity: z.enum(["required", "advisory"]),
  enabled: z.boolean().default(true),
  position: z.number().int().min(1).optional(),
});

export const updateRuleSchema = ruleInputSchema.partial();

export const reorderSchema = z.object({
  order: z.array(z.number().int()).min(1),
});

export const dryRunRuleSchema = ruleInputSchema.extend({
  id: z.number().int().optional(),
});

export const dryRunSchema = z.object({
  repo: z.string().trim().min(1),
  day: z.object({
    day_number: z.number().int().min(1),
    title: z.string(),
    requirements_md: z.string(),
  }),
  rules: z.array(dryRunRuleSchema),
  useGemini: z.boolean().default(false),
});

export type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export function validateRuleType(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(ruleModules, type);
}

export function validateParams(type: string, params: unknown): ValidationResult {
  const mod = ruleModules[type];
  if (!mod) return { ok: false, error: `Unknown rule type "${type}".` };
  const parsed = mod.paramsSchema.safeParse(params ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "params"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Invalid params: ${issues}` };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}
