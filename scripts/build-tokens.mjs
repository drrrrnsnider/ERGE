#!/usr/bin/env node
/**
 * build-tokens.mjs — Figma DTCG export → CSS custom properties
 *
 * Reads the raw Figma variable exports and writes src/tokens/tokens.css.
 * This file is GENERATED. Never hand-edit the output; re-run this instead.
 *
 *   npm run tokens
 *
 * Input   tokens/figma/Primitives.tokens.json    the primitive ramps and scales
 *         tokens/figma/Dark.tokens.json          the semantic layer, dark mode
 * Output  src/tokens/tokens.css
 *
 * Why the two layers stay separate in the output:
 *
 *   Primitives land in :root as plain custom properties. They are deliberately
 *   NOT inside @theme, because @theme makes Tailwind generate utilities — and
 *   `bg-umber-500` existing at all is an invitation to bypass the semantic
 *   layer. Keeping them out of @theme means the only colour utilities that
 *   exist are the role names defined in theme.css.
 *
 *   Semantic tokens land in :root as var() references to primitives, so the
 *   alias structure you built in Figma survives into the browser. Changing
 *   Copper/400 in Figma updates every token that points at it.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const IN_PRIMITIVES = resolve(ROOT, "tokens/figma/Primitives.tokens.json");
const IN_SEMANTIC = resolve(ROOT, "tokens/figma/Dark.tokens.json");
const OUT = resolve(ROOT, "src/tokens/tokens.css");

/* ---------------------------------------------------------------- helpers */

/** "Color/Font Size/21" -> "font-size-21" (drops the leading group). */
function slug(path, { dropFirst = false } = {}) {
  const parts = path.split("/");
  if (dropFirst) parts.shift();
  return parts
    .join("-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Walk a DTCG tree, yielding [slashPath, tokenObject]. */
function* walk(node, path = "") {
  if (node === null || typeof node !== "object") return;
  if ("$type" in node) {
    yield [path, node];
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    yield* walk(value, path ? `${path}/${key}` : key);
  }
}

const ext = (token) => token.$extensions ?? {};
const aliasOf = (token) => ext(token)["com.figma.aliasData"] ?? null;
const composedOf = (token) => ext(token)["com.figma.composedColor"] ?? null;

/** Render a token's resolved literal value, for use as a fallback or comment. */
function literal(token) {
  const v = token.$value;
  if (token.$type === "color") {
    if (typeof v === "string") return v;
    const alpha = v.alpha ?? 1;
    if (alpha >= 1) return v.hex;
    const [r, g, b] = v.hex
      .replace("#", "")
      .match(/../g)
      .map((h) => parseInt(h, 16));
    return `rgb(${r} ${g} ${b} / ${+alpha.toFixed(4)})`;
  }
  if (token.$type === "number") {
    // Spacing, radius and font size all come out of Figma as raw pixel
    // numbers. Emit rem so the whole system respects the user's browser
    // font-size setting — a WCAG 1.4.4 concern we would otherwise fail.
    return v === 0 ? "0" : `${v / 16}rem`;
  }
  return String(v);
}

/* ------------------------------------------------------------------- read */

function load(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`\n  Could not read ${file}`);
    console.error(`  ${error.message}\n`);
    console.error("  Export both collections from Figma into tokens/figma/.\n");
    process.exit(1);
  }
}

const primitivesDoc = load(IN_PRIMITIVES);
const semanticDoc = load(IN_SEMANTIC);

const primitives = [...walk(primitivesDoc)];
const semantic = [...walk(semanticDoc)];

/* Map "Color/Copper/400" (Figma's variable name) -> "--color-copper-400". */
const primitiveVarByFigmaName = new Map(
  primitives.map(([path]) => [path, `--${slug(path)}`]),
);

/* -------------------------------------------------------------- resolution */

const problems = [];

/**
 * Turn a semantic token into a CSS value.
 *
 * Three cases, in order:
 *   1. plain alias      -> var(--color-copper-400)
 *   2. composed colour  -> color-mix(in srgb, var(--x) 25%, transparent)
 *   3. no reference     -> the literal, plus a warning (this means someone
 *                          typed a raw value into the semantic collection,
 *                          which breaks the two-layer contract)
 */
function resolveSemantic(path, token) {
  const alias = aliasOf(token);
  if (alias) {
    const target = primitiveVarByFigmaName.get(alias.targetVariableName);
    if (!target) {
      problems.push(
        `${path} aliases "${alias.targetVariableName}", which is not in the primitives export`,
      );
      return literal(token);
    }
    return `var(${target})`;
  }

  const composed = composedOf(token);
  if (composed?.colorArg?.type === "alias") {
    const name = composed.colorArg.alias.targetVariableName;
    const target = primitiveVarByFigmaName.get(name);
    const pct = composed.opacityArg?.value ?? 100;
    if (!target) {
      problems.push(
        `${path} composes "${name}", which is not in the primitives export`,
      );
      return literal(token);
    }
    return `color-mix(in srgb, var(${target}) ${pct}%, transparent)`;
  }

  problems.push(
    `${path} has no alias — it is a raw value in the semantic collection. ` +
      `Point it at a primitive in Figma.`,
  );
  return literal(token);
}

/* ------------------------------------------------------------------ build */

const groupsSeen = new Map();
for (const [path] of primitives) {
  const group = path.split("/")[0];
  groupsSeen.set(group, (groupsSeen.get(group) ?? 0) + 1);
}

const lines = [];
const push = (s = "") => lines.push(s);

push("/* ---------------------------------------------------------------");
push(" * GENERATED FILE — DO NOT EDIT");
push(" *");
push(" * Source: Figma variables, exported as DTCG JSON.");
push(" * Regenerate with `npm run tokens`.");
push(" *");
push(" * Any change made here is destroyed by the next export. To change a");
push(" * value, change it in Figma. To change what a value MEANS, edit");
push(" * src/styles/theme.css instead.");
push(` * ------------------------------------------------------------- */`);
push();
push(":root {");
push("  /* == PRIMITIVES ==========================================");
push("   * Raw values. Deliberately outside @theme so Tailwind does");
push("   * not generate utilities for them — components must go");
push("   * through the semantic roles in theme.css, never straight");
push("   * to a primitive. */");

let currentGroup = null;
for (const [path, token] of primitives) {
  const group = path.split("/").slice(0, 2).join("/");
  if (group !== currentGroup) {
    push();
    push(`  /* ${group} */`);
    currentGroup = group;
  }
  push(`  --${slug(path)}: ${literal(token)};`);
}

push();
push("  /* == SEMANTIC ============================================");
push(`   * Mode: ${semanticDoc.$extensions?.["com.figma.modeName"] ?? "unknown"}`);
push("   * Each of these points at a primitive, mirroring the alias");
push("   * structure in Figma. */");

currentGroup = null;
for (const [path, token] of semantic) {
  const group = path.split("/").slice(0, 2).join("/");
  if (group !== currentGroup) {
    push();
    push(`  /* ${group} */`);
    currentGroup = group;
  }
  const value = resolveSemantic(path, token);
  push(`  --${slug(path)}: ${value};`);
}

push("}");
push();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");

/* ----------------------------------------------------------------- report */

console.log(`\n  tokens.css written`);
console.log(`    primitives  ${primitives.length}`);
for (const [group, count] of groupsSeen) {
  console.log(`      ${group.padEnd(14)}${count}`);
}
console.log(`    semantic    ${semantic.length}`);
console.log(`    mode        ${semanticDoc.$extensions?.["com.figma.modeName"]}`);

if (problems.length) {
  console.log(`\n  ${problems.length} problem(s):`);
  for (const p of problems) console.log(`    - ${p}`);
  console.log();
  process.exit(1);
}
console.log(`\n  All semantic tokens resolved to primitives.\n`);
