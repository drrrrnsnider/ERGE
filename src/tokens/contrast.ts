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

/** Every `--color-*: #rrggbb` declared in the generated primitives. */
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
 * Role -> hex for one theme. `scope` is the CSS selector whose block we read,
 * so ':root' gives light mode and '.dark' gives dark mode.
 */
export function readRoles(scope: ':root' | '.dark'): Record<string, string> {
  const css = readFileSync(THEME, 'utf8')
  const primitives = readPrimitives()

  // Grab just this selector's block. The theme file has no nested braces
  // inside :root/.dark, so matching to the first '}' is sufficient.
  const block = new RegExp(`\\${scope}\\s*\\{([^}]*)\\}`).exec(css)?.[1]
  if (!block) throw new Error(`No ${scope} block found in theme.css`)

  const out: Record<string, string> = {}
  for (const [, role, ref] of block.matchAll(
    /(--[\w-]+)\s*:\s*var\((--color-[\w-]+)\)\s*;/g,
  )) {
    const hex = primitives[ref!]
    if (!hex) throw new Error(`${role} points at ${ref}, which is not a token`)
    out[role!.slice(2)] = hex
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
