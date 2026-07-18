// Static guard against the "server-only import leaks into client bundle" bug class.
//
// React Router 7's Vite plugin strips `loader`/`action`/`headers`/`middleware` exports
// (and anything only they reference) out of the client bundle. If a binding imported
// from a `*.server` module is ALSO referenced by client-visible code (the default-export
// component, `ErrorBoundary`, or module top-level statements), the server module can't be
// tree-shaken out and gets pulled into the client bundle -> blank page at runtime.
// Two real instances of this were fixed by moving the needed constant to a plain
// non-.server module (FREE_MONTHLY_CAP -> services/billing-limits.ts,
// PRESETS -> services/import-presets.ts).
//
// This test parses each route module with the TypeScript compiler API and fails if any
// binding imported from a server-only module is referenced outside the loader/action/
// headers function bodies.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROUTES_DIR = path.resolve(__dirname, "../routes");

function isServerModuleSpecifier(specifier: string): boolean {
  // Heuristic per spec: specifier ends in/contains ".server", or plainly is a
  // `*/db.server` module. All server modules in this codebase are relative imports
  // ending in ".server" (e.g. "../shopify.server", "../services/foo.server",
  // "../services/db.server"), so a substring check on ".server" covers every case,
  // including the explicit ".server.ts"/".server.tsx" extension form.
  return specifier.includes(".server");
}

type ServerBinding = { name: string; from: string };

interface Leak {
  file: string;
  binding: string;
  from: string;
}

const SAFE_EXPORT_NAMES = new Set(["loader", "action", "headers"]);

/**
 * Collect every local binding name imported from a server-only module, and the
 * ImportDeclaration nodes themselves (so the leak-walk can skip over them - an
 * import specifier is a declaration, not a "reference").
 */
function collectServerBindings(sourceFile: ts.SourceFile): {
  bindings: ServerBinding[];
  importNodes: Set<ts.Node>;
} {
  const bindings: ServerBinding[] = [];
  const importNodes = new Set<ts.Node>();

  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    importNodes.add(stmt);

    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const specifier = stmt.moduleSpecifier.text;
    if (!isServerModuleSpecifier(specifier)) continue;

    // Whole-declaration `import type ...` -> nothing is a value binding.
    if (stmt.importClause?.isTypeOnly) continue;

    const clause = stmt.importClause;
    if (!clause) continue;

    // Default import: `import prisma from "../services/db.server"`
    if (clause.name) {
      bindings.push({ name: clause.name.text, from: specifier });
    }

    const namedBindings = clause.namedBindings;
    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      // `import * as db from "../services/db.server"`
      bindings.push({ name: namedBindings.name.text, from: specifier });
    } else if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const el of namedBindings.elements) {
        if (el.isTypeOnly) continue; // `import { type Foo }` - type-only, skip
        bindings.push({ name: el.name.text, from: specifier });
      }
    }
  }

  return { bindings, importNodes };
}

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind): boolean =>
  !!ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some((m) => m.kind === kind);

const hasExportModifier = (node: ts.Node): boolean =>
  hasModifier(node, ts.SyntaxKind.ExportKeyword);

const hasDefaultModifier = (node: ts.Node): boolean =>
  hasModifier(node, ts.SyntaxKind.DefaultKeyword);

/**
 * Collect every identifier referenced within `node` (skipping nested type
 * positions and import declarations, which don't produce runtime references).
 */
function collectIdentifiersInto(node: ts.Node, out: ts.Identifier[]): void {
  if (ts.isTypeNode(node) || ts.isImportDeclaration(node)) return;
  if (ts.isIdentifier(node)) out.push(node);
  ts.forEachChild(node, (child) => collectIdentifiersInto(child, out));
}

/** A top-level declaration this module makes, keyed by the name it binds. */
interface TopLevelDecl {
  name: string;
  /** Node to scan for outgoing references (function body / initializer / whole decl). */
  scanNode: ts.Node;
}

function findLeaks(filePath: string): Leak[] {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const { bindings, importNodes } = collectServerBindings(sourceFile);
  if (bindings.length === 0) return [];
  const bindingMap = new Map(bindings.map((b) => [b.name, b.from]));

  // Map of every non-loader/action/headers top-level named declaration (function,
  // class, or `const x = ...`), so we can trace which of them are transitively
  // reachable from client code (mirrors how Rollup tree-shakes the client bundle:
  // a helper called only from `loader`/`action`/`headers` is dead code on the
  // client and never actually leaks, even though it's a "module top-level
  // statement" syntactically).
  const declsByName = new Map<string, TopLevelDecl>();
  // Roots: nodes that unconditionally run in the client bundle - the default
  // export component, any exported ErrorBoundary, and bare top-level statements
  // that aren't declarations (rare, but included for completeness).
  const clientRoots: ts.Node[] = [];
  let defaultExportName: string | null = null;
  let defaultExportIsInlineFn = false;

  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) continue;

    if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
      const name = stmt.name.text;
      if (hasExportModifier(stmt) && hasDefaultModifier(stmt)) {
        clientRoots.push(stmt.body);
        defaultExportIsInlineFn = true;
      } else if (hasExportModifier(stmt) && SAFE_EXPORT_NAMES.has(name)) {
        // export function loader/action/headers - safe zone, not part of the graph.
      } else if (hasExportModifier(stmt) && name === "ErrorBoundary") {
        clientRoots.push(stmt.body);
      } else {
        declsByName.set(name, { name, scanNode: stmt.body });
      }
      continue;
    }

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const name = decl.name.text;
        const init = decl.initializer;
        const scanNode: ts.Node | undefined =
          init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))
            ? init.body
            : init;
        if (!scanNode) continue;

        if (hasExportModifier(stmt) && SAFE_EXPORT_NAMES.has(name)) {
          // export const loader/action/headers = ... - safe zone.
          continue;
        }
        if (hasExportModifier(stmt) && name === "ErrorBoundary") {
          clientRoots.push(scanNode);
          continue;
        }
        declsByName.set(name, { name, scanNode });
      }
      continue;
    }

    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      // `export default someIdentifier;`
      if (ts.isIdentifier(stmt.expression)) {
        defaultExportName = stmt.expression.text;
      } else {
        clientRoots.push(stmt.expression);
      }
      continue;
    }

    if (
      ts.isClassDeclaration(stmt) ||
      ts.isInterfaceDeclaration(stmt) ||
      ts.isTypeAliasDeclaration(stmt) ||
      ts.isExportDeclaration(stmt) ||
      ts.isEmptyStatement(stmt)
    ) {
      if (ts.isClassDeclaration(stmt) && stmt.name) {
        declsByName.set(stmt.name.text, { name: stmt.name.text, scanNode: stmt });
      }
      continue;
    }

    // Any other bare top-level statement (rare) runs unconditionally -> client root.
    clientRoots.push(stmt);
  }

  if (defaultExportName && declsByName.has(defaultExportName)) {
    clientRoots.push(declsByName.get(defaultExportName)!.scanNode);
  }
  void defaultExportIsInlineFn;

  // BFS over the reference graph starting from client roots, pulling in any
  // top-level helper transitively referenced from client-reachable code.
  const reachable = new Set<ts.Node>(clientRoots);
  const queue: ts.Node[] = [...clientRoots];
  const visitedDeclNames = new Set<string>();
  const leaksMap = new Map<string, Leak>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    const idents: ts.Identifier[] = [];
    collectIdentifiersInto(node, idents);

    for (const ident of idents) {
      if (importNodes.has(ident)) continue;

      if (bindingMap.has(ident.text)) {
        const from = bindingMap.get(ident.text)!;
        const key = ident.text;
        if (!leaksMap.has(key)) {
          leaksMap.set(key, {
            file: path.relative(ROUTES_DIR, filePath),
            binding: ident.text,
            from,
          });
        }
      }

      const decl = declsByName.get(ident.text);
      if (decl && !visitedDeclNames.has(decl.name)) {
        visitedDeclNames.add(decl.name);
        reachable.add(decl.scanNode);
        queue.push(decl.scanNode);
      }
    }
  }

  return Array.from(leaksMap.values());
}

function getRouteFiles(): string[] {
  return fs
    .readdirSync(ROUTES_DIR)
    .filter((name) => /^app[._].*\.tsx$/.test(name) || name === "app.tsx")
    .map((name) => path.join(ROUTES_DIR, name));
}

describe("client/server boundary in embedded admin routes", () => {
  const files = getRouteFiles();

  it("found route files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${path.basename(file)}: no server-only import leaks into client code`, () => {
      const leaks = findLeaks(file);
      if (leaks.length > 0) {
        const msg = leaks
          .map(
            (l) =>
              `  - '${l.binding}' (imported from '${l.from}') is referenced outside loader/action/headers in ${l.file}`,
          )
          .join("\n");
        expect.fail(
          `Server-only import(s) referenced in client-visible code:\n${msg}\n` +
            `Fix: move the shared value to a plain non-.server module (see app/services/billing-limits.ts for precedent).`,
        );
      }
      expect(leaks).toEqual([]);
    });
  }
});
