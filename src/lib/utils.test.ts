import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cn, FONT_SIZES } from './utils'

/**
 * `cn()` must never eat a font size.
 *
 * tailwind-merge guesses what an unknown `text-*` class means, and its guess
 * is "colour". So `cn('text-body-md', 'text-foreground')` used to resolve to
 * `text-foreground` alone — the size dropped, no error, the element quietly
 * inheriting 16px. utils.ts explains the fix; these tests are what stop it
 * coming back.
 *
 * The scale is read out of theme.css rather than written down twice, so a new
 * size added there and forgotten in utils.ts fails here instead of shipping.
 */

/* From the project root, not from `import.meta.url` — these tests run in
 * jsdom, where that is an http:// URL and cannot be turned into a path. */
const THEME = resolve(process.cwd(), 'src/styles/theme.css')

/** Every `--text-<name>` in theme.css, ignoring the `--line-height` pairs. */
function scaleFromTheme(): string[] {
  const css = readFileSync(THEME, 'utf8')
  const names = [...css.matchAll(/^\s*--text-([a-z0-9-]+)\s*:/gm)]
    .map((m) => m[1])
    .filter((name): name is string => typeof name === 'string')
    // `--text-body-lg--line-height` is a modifier on body-lg, not a size.
    .filter((name) => !name.includes('--'))
  return [...new Set(names)]
}

describe('cn', () => {
  it('knows every font size theme.css defines', () => {
    expect([...FONT_SIZES].sort()).toEqual(scaleFromTheme().sort())
  })

  it.each(scaleFromTheme())('keeps text-%s when a colour is merged in', (size) => {
    /* Both orders: the size can be written before or after the colour, and
     * neither should win over the other, because they are not in conflict. */
    expect(cn(`text-${size}`, 'text-foreground')).toContain(`text-${size}`)
    expect(cn('text-foreground', `text-${size}`)).toContain(`text-${size}`)
  })

  it('still lets one size override another', () => {
    expect(cn('text-body-md', 'text-h2')).toBe('text-h2')
  })

  it('still lets one colour override another', () => {
    expect(cn('text-foreground', 'text-primary')).toBe('text-primary')
  })

  it('keeps size and colour together in a realistic call', () => {
    const out = cn('text-body-md font-semibold text-foreground', 'text-primary')
    expect(out).toContain('text-body-md')
    expect(out).toContain('text-primary')
    expect(out).not.toContain('text-foreground')
  })

  it('has not broken Tailwind’s own scale', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    expect(cn('text-sm', 'text-foreground')).toBe('text-sm text-foreground')
  })
})
