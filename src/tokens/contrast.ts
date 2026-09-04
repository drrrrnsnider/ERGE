/**
 * Small WCAG contrast helper used by the token tests.
 *
 * This exists so that "WCAG 2.2 AA, enforced at the token layer" is a thing
 * the test suite actually checks, rather than a promise in a comment. It reads
 * the real CSS files, so it fails when someone changes a colour — including
 * when a regenerated Figma export changes one.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Resolved from the project root, which is where Vitest runs.
const TOKENS = resolve(process.cwd(), 'src/tokens/tokens.css')
const THEME = resolve(process.cwd(), 'src/styles/theme.css')

/**
 * Every `--color-*: #rrggbb` declared in the generated primitives — the raw
 * ramps (obsidian-950, copper-400) that everything else bottoms out at.
 */
export function readPrimitives(): Record<string, string> {
  const css = readFileSync(TOKENS, 'utf8')
  const out: Record<string, string> = {}
  for (const [, name, hex] of css.matchAll(
    /(--color-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g,
  )) {
    out[name!] = hex!
  }
  return out
}

/**
 * The Figma semantic layer: `--color-surface-base: var(--color-obsidian-950)`
 * resolved down to `#0D1010`.
 *
 * This is the indirection that makes the two-layer contract real — a semantic
 * token is never a literal, it always points at a primitive. Tokens declared
 * as `color-mix(...)` (the translucent focus and transparent border) are
 * skipped: they have no flat hex, so WCAG contrast against them is not
 * meaningful without knowing what they sit on.
 */
export function readSemantic(): Record<string, string> {
  const css = readFileSync(TOKENS, 'utf8')
  const primitives = readPrimitives()
  const out: Record<string, string> = {}
  for (const [, name, ref] of css.matchAll(
    /(--color-[\w-]+)\s*:\s*var\((--color-[\w-]+)\)\s*;/g,
  )) {
    const hex = primitives[ref!]
    if (!hex) throw new Error(`${name} points at ${ref}, which is not a token`)
    out[name!] = hex
  }
  return out
}

/**
 * shadcn role -> hex, read out of theme.css's `:root` block.
 *
 * Dark only: there is one theme now, so there is one block. Each role points
 * at a semantic token (`--primary: var(--color-action-primary)`), which in
 * turn points at a primitive — so this resolves two hops, not one.
 */
export function readRoles(): Record<string, string> {
  const css = readFileSync(THEME, 'utf8')
  const semantic = readSemantic()

  // Grab just the :root block. The theme file has no nested braces inside it,
  // so matching to the first '}' is sufficient.
  const block = /:root\s*\{([^}]*)\}/.exec(css)?.[1]
  if (!block) throw new Error('No :root block found in theme.css')

  const out: Record<string, string> = {}
  for (const [, role, ref] of block.matchAll(
    /(--[\w-]+)\s*:\s*var\((--color-[\w-]+)\)\s*;/g,
  )) {
    const hex = semantic[ref!]
    // Roles may legitimately point at non-colour tokens (radius, font family).
    // Only colour roles belong in the contrast matrix.
    if (hex) out[role!.slice(2)] = hex
  }
  return out
}

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** WCAG 2.x contrast ratio, 1..21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  const [hi, lo] = x > y ? [x, y] : [y, x]
  return (hi + 0.05) / (lo + 0.05)
}
