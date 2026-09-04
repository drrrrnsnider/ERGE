import { describe, expect, it } from 'vitest'
import { contrast, readRoles, readSemantic } from './contrast'

/**
 * The accessibility target for this app is WCAG 2.2 AA, enforced at the token
 * layer. That means: a colour pairing that fails AA should break the build,
 * not wait to be caught in review or by an axe scan of one page that happens
 * to use it.
 *
 * 1.4.3 Contrast (Minimum)  — text needs 4.5:1
 * 1.4.11 Non-text Contrast  — control boundaries and focus rings need 3:1
 *
 * These assert the Figma semantic tokens directly, not shadcn's role names.
 * The tokens are where the design decision lives; the roles are just an
 * adapter onto them. Dark only — there is one theme.
 */

const semantic = readSemantic()

/** Resolve a token name to hex, failing loudly if the export dropped it. */
function token(name: string): string {
  const hex = semantic[`--color-${name}`]
  if (!hex) throw new Error(`--color-${name} is not in the Figma export`)
  return hex
}

/**
 * The three surfaces anything can land on. This is a matrix, not a list of
 * "designed" pairs: Text/Muted is not only used on the page background, it
 * lands on cards and elevated chrome too, and a pairing that clears AA on one
 * surface can fail on another. An axe scan only catches the combinations a
 * page happens to render; this catches all of them, including ones no screen
 * uses yet.
 */
const SURFACES = ['surface-base', 'surface-card', 'surface-elevated'] as const

/**
 * Text/Disabled is deliberately absent. It is the inactive-control colour, and
 * WCAG 1.4.3 exempts disabled controls from contrast minimums — it measures
 * 2.52 / 2.32 / 1.99 against the three surfaces, which is the point: disabled
 * text is supposed to read as unavailable. Do not "fix" it by darkening a
 * surface or lightening the token.
 */
const BODY_TEXT = ['text-primary', 'text-secondary', 'text-muted'] as const

/** Fills that carry text on top of them, rather than sitting on a surface. */
const TEXT_ON_FILL: ReadonlyArray<readonly [string, string]> = [
  // Guards the mapping decision in theme.css: primary-foreground is
  // Text/Inverse, not Action/Inverse. Action/Inverse here would be 2.27:1.
  ['text-inverse', 'action-primary'],
  ['text-inverse', 'feedback-error'],
]

describe('text contrast (1.4.3, 4.5:1)', () => {
  const pairs = BODY_TEXT.flatMap((fg) =>
    SURFACES.map((bg) => [fg, bg] as const),
  )

  it.each(pairs)('%s on %s', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(TEXT_ON_FILL)('%s on %s', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('non-text contrast (1.4.11, 3:1)', () => {
  /**
   * Border/Input is a control boundary, so it has to be perceivable on its
   * own. Only Base and Card: an input is never rendered on Surface/Elevated,
   * which is chrome rather than a form surface. (It would pass there anyway,
   * at 3.19 — the exclusion is about what we actually build, not headroom.)
   */
  it.each(['surface-base', 'surface-card'] as const)(
    'border-input on %s',
    (bg) => {
      expect(contrast(token('border-input'), token(bg))).toBeGreaterThanOrEqual(
        3,
      )
    },
  )

  it.each(SURFACES)('border-focus on %s', (bg) => {
    expect(contrast(token('border-focus'), token(bg))).toBeGreaterThanOrEqual(3)
  })
})

/**
 * The bridge has to keep pointing at tokens that exist. Every colour role in
 * theme.css resolves through the semantic layer to a real primitive — if a
 * regenerated export renames or drops a token, this fails rather than the app
 * silently losing a colour.
 */
describe('theme bridge', () => {
  const roles = readRoles()

  it('maps every shadcn colour role base-nova uses', () => {
    const required = [
      'background',
      'foreground',
      'card',
      'card-foreground',
      'popover',
      'popover-foreground',
      'primary',
      'primary-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'destructive',
      'destructive-foreground',
      'border',
      'input',
      'ring',
    ]
    expect(Object.keys(roles).sort()).toEqual(required.sort())
  })

  it('pairs primary-foreground with primary at AA', () => {
    // The same assertion as above, but through the bridge rather than the
    // tokens, so re-pointing --primary-foreground at Action/Inverse fails here
    // too and not only in review.
    expect(
      contrast(roles['primary-foreground']!, roles['primary']!),
    ).toBeGreaterThanOrEqual(4.5)
  })
})
