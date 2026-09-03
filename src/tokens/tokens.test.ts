import { describe, expect, it } from 'vitest'
import { contrast, readRoles } from './contrast'

/**
 * The accessibility target for this app is WCAG 2.2 AA, enforced at the token
 * layer. That means: a colour pairing that fails AA should break the build,
 * not wait to be caught in review or by an axe scan of one page that happens
 * to use it.
 *
 * 1.4.3 Contrast (Minimum)  — text needs 4.5:1
 * 1.4.11 Non-text Contrast  — control boundaries and focus rings need 3:1
 */

/**
 * Every foreground/surface combination that can legitimately occur.
 *
 * Note this is a matrix, not a list of "designed" pairs. `muted-foreground` is
 * not only used on the page background — it lands on cards, popovers and muted
 * chips too, and a pairing that passes on white can fail on grey. An axe scan
 * only catches the combinations a page happens to render; this catches all of
 * them, including ones no screen uses yet.
 */
const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ...(['background', 'card', 'popover', 'muted', 'secondary', 'accent'].map(
    (surface) => ['foreground', surface] as const,
  )),
  ...(['background', 'card', 'popover', 'muted'].map(
    (surface) => ['muted-foreground', surface] as const,
  )),
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
]

// Pairs that are never text, but do have to be perceivable as UI.
const NON_TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['input', 'background'],
  ['ring', 'background'],
]

describe.each([':root', '.dark'] as const)('%s theme', (scope) => {
  const roles = readRoles(scope)

  it.each(TEXT_PAIRS)('%s on %s meets AA text contrast (4.5:1)', (fg, bg) => {
    const a = roles[fg]
    const b = roles[bg]
    expect(a, `role --${fg} is not defined in ${scope}`).toBeDefined()
    expect(b, `role --${bg} is not defined in ${scope}`).toBeDefined()
    expect(contrast(a!, b!)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(NON_TEXT_PAIRS)('%s on %s meets AA UI contrast (3:1)', (fg, bg) => {
    const a = roles[fg]
    const b = roles[bg]
    expect(a, `role --${fg} is not defined in ${scope}`).toBeDefined()
    expect(b, `role --${bg} is not defined in ${scope}`).toBeDefined()
    expect(contrast(a!, b!)).toBeGreaterThanOrEqual(3)
  })
})
