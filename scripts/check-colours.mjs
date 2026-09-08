#!/usr/bin/env node
/**
 * check-colours.mjs — the no-raw-hex rule
 *
 *   npm run lint     (runs after oxlint)
 *
 * The token architecture only holds if colour enters the app through exactly
 * one door: a Figma token, given meaning in src/styles/theme.css, referred to
 * by role name in a component. A hex typed into a component bypasses all
 * three layers. It will not respond to a re-export, it is invisible to the
 * contrast matrix in src/tokens/tokens.test.ts, and nothing else in the build
 * will notice it — which is what makes it worth a rule rather than a habit.
 *
 * WHY THIS IS NOT AN OXLINT RULE
 * ------------------------------
 * It should be. oxlint does not implement `no-restricted-syntax`, and it
 * rejects the whole config file when it meets a rule it does not know, so
 * there is no way to express this in .oxlintrc.json today. The alternatives
 * were adding ESLint alongside oxlint for one rule — a second linter to keep
 * in sync, and a dependency — or this. If oxlint gains the rule, or gains JS
 * plugins, delete this file and move the patterns into .oxlintrc.json.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, extname } from "node:path";

const ROOT = resolve(process.cwd());

/* ------------------------------------------------------------------ scope */

/** Only files that can actually put colour on screen. */
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".html"]);
const ROOTS = ["src", "e2e", "index.html"];

/**
 * Files exempt from the rule, each with the reason it is exempt. Kept as a
 * table so an exemption is a visible decision rather than a silent gap — if
 * this list grows, the rule is being worked around instead of followed.
 */
const ALLOWED = {
  "src/tokens/tokens.css":
    "generated from the Figma export; hex here is the point. " +
    "Guarded separately by `npm run tokens:check`.",
  "src/tokens/contrast.ts":
    "parses hex out of the generated CSS to compute contrast ratios, so it " +
    "necessarily contains hex patterns and worked examples.",
};

/* --------------------------------------------------------------- patterns */

/**
 * What counts as a raw colour.
 *
 *   pattern              catches                        instead use
 *   ------------------   ----------------------------   ---------------------
 *   #rgb #rrggbb …       #1266d6, #fff, #0D1010ff       a role: bg-primary
 *   rgb() hsl() oklch()  rgb(18 102 214), oklch(...)     a role
 *   Tailwind palette     bg-blue-500, text-gray-600      a role
 *   white / black        text-white, bg-black            a role
 *
 * The Tailwind entries matter as much as the hex ones: `bg-blue-500` looks
 * tokenised, but it resolves to Tailwind's own palette, not ours, so it will
 * not move when the design system does.
 *
 * Deliberately NOT matched: `color-mix(in oklch, ...)`. There `oklch` names a
 * colour space, not a colour, and the arguments are var() references to real
 * tokens — which is exactly the correct way to derive a colour.
 */
const TAILWIND_PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|" +
  "teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITY_PREFIX =
  "bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|accent|" +
  "caret|divide|shadow|placeholder";

const RULES = [
  {
    name: "raw hex colour",
    // 3, 4, 6 or 8 hex digits — the four legal CSS hex lengths. Lengths like
    // 5 or 7 are not colours, and `#main` is not one either (m is not hex).
    re: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g,
  },
  {
    name: "raw colour function",
    re: /\b(?:rgba?|hsla?|oklch|oklab)\s*\(/g,
  },
  {
    name: "Tailwind default palette utility",
    re: new RegExp(
      `(?:^|[\\s"'\`:\\[{(])(?:${UTILITY_PREFIX})-(?:${TAILWIND_PALETTE})-\\d{2,3}\\b`,
      "g",
    ),
  },
  {
    name: "Tailwind white/black utility",
    re: new RegExp(
      `(?:^|[\\s"'\`:\\[{(])(?:${UTILITY_PREFIX})-(?:white|black)\\b`,
      "g",
    ),
  },
];

/* ------------------------------------------------------------------- walk */

function* files(entry) {
  const full = resolve(ROOT, entry);
  let stat;
  try {
    stat = statSync(full);
  } catch {
    return; // a root that does not exist yet is not an error
  }
  if (stat.isFile()) {
    if (EXTENSIONS.has(extname(full))) yield full;
    return;
  }
  for (const name of readdirSync(full)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    yield* files(join(entry, name));
  }
}

/* ------------------------------------------------------------------- scan */

const findings = [];
let scanned = 0;
const skipped = [];

for (const root of ROOTS) {
  for (const file of files(root)) {
    const rel = relative(ROOT, file);
    if (rel in ALLOWED) {
      skipped.push(rel);
      continue;
    }
    scanned++;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const rule of RULES) {
        rule.re.lastIndex = 0;
        for (const match of line.matchAll(rule.re)) {
          findings.push({
            file: rel,
            line: i + 1,
            rule: rule.name,
            text: match[0].trim(),
            context: line.trim().slice(0, 78),
          });
        }
      }
    });
  }
}

/* ----------------------------------------------------------------- report */

if (findings.length === 0) {
  console.log(
    `\n  no raw colour in ${scanned} files ` +
      `(${skipped.length} allowed by exemption)\n`,
  );
  process.exit(0);
}

console.error(`\n  ${findings.length} raw colour value(s):\n`);
for (const f of findings) {
  console.error(`    ${f.file}:${f.line}  ${f.rule}`);
  console.error(`      ${f.context}`);
  console.error("");
}
console.error(
  `  Colour belongs to the token layer, not to a component.\n` +
    `\n` +
    `    To change a VALUE   change it in Figma, then \`npm run tokens\`.\n` +
    `    To change a MEANING edit src/styles/theme.css.\n` +
    `    In a component      use a role: bg-primary, text-muted-foreground.\n` +
    `\n` +
    `  If the role you need does not exist in theme.css, stop and ask rather\n` +
    `  than improvising one — see CLAUDE.md.\n` +
    `\n` +
    `  If this is a VENDORED file under src/components/ui/ that arrived from\n` +
    `  \`shadcn add\`, do not edit it. Either re-point the role in theme.css so\n` +
    `  the component does not need the literal, or add the file to ALLOWED in\n` +
    `  this script with the reason.\n`,
);
process.exit(1);
