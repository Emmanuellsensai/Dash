import { z } from "zod";
import { walk, type Node } from "../walk";
import type { RuleContext, RuleEvaluation, RuleModule } from "../context";

const paramsSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["var", "let", "const", "function", "class", "param", "import"]).optional(),
});

type Params = z.infer<typeof paramsSchema>;

function patternHasName(pattern: Node | null | undefined, name: string): boolean {
  if (!pattern) return false;
  switch (pattern.type) {
    case "Identifier":
      return pattern.name === name;
    case "ObjectPattern": {
      const properties = (pattern.properties ?? []) as Node[];
      return properties.some((p) =>
        p.type === "RestElement"
          ? patternHasName(p.argument as Node, name)
          : patternHasName(p.value as Node, name),
      );
    }
    case "ArrayPattern": {
      const elements = (pattern.elements ?? []) as (Node | null)[];
      return elements.some((el) => patternHasName(el, name));
    }
    case "AssignmentPattern":
      return patternHasName(pattern.left as Node, name);
    case "RestElement":
      return patternHasName(pattern.argument as Node, name);
    default:
      return false;
  }
}

export const identifierDeclared: RuleModule<Params> = {
  id: "identifier_declared",
  label: "Identifier declared",
  needsParse: true,
  paramsSchema,
  evaluate(ctx: RuleContext, params: Params): RuleEvaluation {
    const kinds: string[] = [];
    for (const file of ctx.files) {
      const ast = file.parsed.ast;
      if (!ast) continue;
      walk(ast, (node, ancestors) => {
        if (node.type === "VariableDeclarator") {
          const id = node.id as Node | undefined;
          const parent = ancestors[ancestors.length - 1];
          const declKind =
            parent?.type === "VariableDeclaration" && typeof parent.kind === "string"
              ? parent.kind
              : "var";
          if (id?.type === "Identifier" && id.name === params.name) kinds.push(declKind);
          else if (id && patternHasName(id, params.name)) kinds.push(declKind);
          return;
        }
        if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
          const id = node.id as Node | null;
          if (id?.type === "Identifier" && id.name === params.name) kinds.push("function");
          for (const param of (node.params ?? []) as Node[]) {
            if (patternHasName(param, params.name)) kinds.push("param");
          }
          return;
        }
        if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
          const id = node.id as Node | null;
          if (id?.type === "Identifier" && id.name === params.name) kinds.push("class");
          return;
        }
        if (
          node.type === "ImportSpecifier" ||
          node.type === "ImportDefaultSpecifier" ||
          node.type === "ImportNamespaceSpecifier"
        ) {
          const local = node.local as Node | undefined;
          if (local?.type === "Identifier" && local.name === params.name) kinds.push("import");
        }
      });
    }

    const declared = params.kind === undefined || kinds.includes(params.kind);
    if (declared && kinds.length > 0) return { passed: true, evidence: [] };

    return {
      passed: false,
      evidence: [
        {
          file: ctx.files[0]?.path ?? ctx.rule.file_pattern,
          line: 0,
          column: 0,
          detail:
            params.kind === undefined
              ? `Identifier ${params.name} is not declared`
              : `Identifier ${params.name} is not declared as ${params.kind}`,
        },
      ],
    };
  },
};
