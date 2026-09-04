import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Automated accessibility scan of every screen, in a real browser.
 *
 * Two honest caveats, so nobody reads a green run as "this is accessible":
 *  - axe catches roughly a third to a half of WCAG issues. Keyboard order,
 *    focus management and sensible labelling still need a human.
 *  - the token-level contrast guarantees are checked separately, in
 *    src/tokens/tokens.test.ts, because those must hold for colour pairings
 *    that no page happens to render yet.
 */

const WCAG22AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.describe('accessibility', () => {
  test('home screen has no detectable WCAG 2.2 AA violations', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ERGE' })).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(WCAG22AA)
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('home screen passes in dark mode too', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => {
      document.documentElement.classList.add('dark')

      /* Buttons carry `transition-all`, so flipping the theme starts a colour
       * animation. Scanning straight away samples a half-blended frame — a
       * mid-transition mix of the light and dark values that belongs to
       * neither theme — and axe reports contrast failures for colours the app
       * never actually rests on. Wait for the transitions to finish so we
       * assert against the settled dark theme, which is the thing we mean. */
      await Promise.all(
        document.getAnimations().map((animation) => animation.finished),
      )
    })

    const results = await new AxeBuilder({ page })
      .withTags(WCAG22AA)
      .analyze()

    expect(results.violations).toEqual([])
  })

  /**
   * The app is dark-only, and `<html class="dark">` is what makes that true.
   * src/styles/theme.css binds Tailwind's `dark:` variant to that class, and
   * the vendored base-nova components carry nine `dark:` utilities of their
   * own. Drop the class and those stop matching — every surface, border and
   * the outline button silently revert to light-mode styling on top of our
   * dark tokens, with no light theme to fall back to.
   *
   * That failure is invisible to axe (it is a design regression, not a
   * violation), so it gets its own assertion.
   */
  test('the dark class is present on <html>', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  })

  /**
   * Every interactive target on the page, with its rendered size and whether
   * it has opted out of the coarse-pointer floor.
   *
   * `sr-only` elements are excluded: the skip link measures 1x1 while hidden
   * and only becomes a target once focused, which its own test covers.
   */
  async function measureTargets(page: Page) {
    return page.evaluate(() => {
      const selector =
        'a, button, input, select, textarea, [role="button"], [role="link"]'
      return [...document.querySelectorAll(selector)]
        .filter((el) => !el.classList.contains('sr-only'))
        .map((el) => {
          const { width, height } = el.getBoundingClientRect()
          return {
            label: (el.textContent ?? '').trim().slice(0, 30),
            width: Math.round(width),
            height: Math.round(height),
            compact: el.getAttribute('data-target') === 'compact',
          }
        })
    })
  }

  const tooSmall = (min: number) =>
    ({ width, height }: { width: number; height: number }) =>
      width < min || height < min

  /**
   * WCAG 2.2 2.5.8 Target Size (Minimum) — the legal floor, 24x24, everywhere.
   * This holds on desktop and mobile, opted out or not.
   */
  test('every interactive target meets the 24px minimum', async ({ page }) => {
    await page.goto('/')
    expect((await measureTargets(page)).filter(tooSmall(24))).toEqual([])
  })

  /**
   * On a phone a thumb needs 44x44, so theme.css raises controls to that under
   * `pointer: coarse`. This asserts it actually happened.
   *
   * Mobile projects only — not a tolerated failure elsewhere, but a rule that
   * deliberately does not apply on desktop, where the same controls are meant
   * to stay dense and `pointer: coarse` does not match.
   */
  test('non-compact targets meet 44px on coarse pointers', async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.startsWith('mobile'),
      'coarse-pointer sizing deliberately does not apply on desktop',
    )
    await page.goto('/')
    const targets = await measureTargets(page)
    expect(targets.filter((t) => !t.compact).filter(tooSmall(44))).toEqual([])
  })

  /**
   * The escape hatch keeps a floor of its own. `data-target="compact"` costs
   * 12px — it does not drop a control to the 24px legal minimum. Anything
   * smaller than 32px is a misuse of the attribute, not a smaller chip.
   *
   * Vacuous on a screen with no compact controls, which is the correct
   * behaviour: the invariant is conditional on opting out.
   */
  test('compact targets still meet 32px on coarse pointers', async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.startsWith('mobile'),
      'coarse-pointer sizing deliberately does not apply on desktop',
    )
    await page.goto('/')
    const targets = await measureTargets(page)
    expect(targets.filter((t) => t.compact).filter(tooSmall(32))).toEqual([])
  })

  test('the first Tab reaches the skip link', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    await expect(
      page.getByRole('link', { name: 'Skip to main content' }),
    ).toBeFocused()
  })
})
