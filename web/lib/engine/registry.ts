import { z } from "zod";
import type { AnyRuleModule } from "./context";
import { fileExists } from "./rules/file_exists";
import { directive } from "./rules/directive";
import { syntaxPresent } from "./rules/syntax_present";
import { syntaxForbidden } from "./rules/syntax_forbidden";
import { functionDefined } from "./rules/function_defined";
import { callUsage } from "./rules/call_usage";
import { identifierDeclared } from "./rules/identifier_declared";
import { commentContains } from "./rules/comment_contains";
import { namingConvention } from "./rules/naming_convention";
import { htmlHas } from "./rules/html_has";
import { jsonField } from "./rules/json_field";

export const ruleModules: Record<string, AnyRuleModule> = {
  file_exists: fileExists,
  directive: directive,
  syntax_present: syntaxPresent,
  syntax_forbidden: syntaxForbidden,
  function_defined: functionDefined,
  call_usage: callUsage,
  identifier_declared: identifierDeclared,
  comment_contains: commentContains,
  naming_convention: namingConvention,
  html_has: htmlHas,
  json_field: jsonField,
};

export interface ParamField {
  name: string;
  kind: "string" | "number" | "boolean" | "enum" | "json";
  label: string;
  options?: string[];
  required: boolean;
  defaultValue?: unknown;
}

interface JsonSchemaProp {
  type?: string | string[];
  enum?: unknown[];
  default?: unknown;
}

function fieldKind(prop: JsonSchemaProp): ParamField["kind"] {
  if (Array.isArray(prop.enum)) return "enum";
  if (prop.type === "string") return "string";
  if (prop.type === "number" || prop.type === "integer") return "number";
  if (prop.type === "boolean") return "boolean";
  return "json";
}

/**
 * Derive the admin form fields for a rule type from its zod schema.
 */
export function describeParams(schema: z.ZodTypeAny): ParamField[] {
  const json = z.toJSONSchema(schema, { io: "input" }) as {
    properties?: Record<string, JsonSchemaProp>;
    required?: string[];
  };
  const props = json.properties ?? {};
  const required = new Set(json.required ?? []);
  return Object.entries(props).map(([name, prop]) => {
    const kind = fieldKind(prop);
    return {
      name,
      kind,
      label: name.replace(/_/g, " "),
      options: kind === "enum" ? (prop.enum as string[]) : undefined,
      required: required.has(name),
      defaultValue: prop.default,
    };
  });
}
