import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

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
   * WCAG 2.2 2.5.8 Target Size (Minimum) — every interactive target is at
   * least 24x24 CSS px.
   *
   * `sr-only` elements are excluded: the skip link measures 1x1 while hidden
   * and only becomes a target once focused, which the test below covers.
   */
  test('interactive targets meet the 24px minimum', async ({ page }) => {
    await page.goto('/')

    const undersized = await page.evaluate(() => {
      const selector =
        'a, button, input, select, textarea, [role="button"], [role="link"]'
      return [...document.querySelectorAll(selector)]
        .filter((el) => !el.classList.contains('sr-only'))
        .map((el) => {
          const { width, height } = el.getBoundingClientRect()
          const label = (el.textContent ?? '').trim().slice(0, 30)
          return { label, width, height }
        })
        .filter(({ width, height }) => width < 24 || height < 24)
    })

    expect(undersized).toEqual([])
  })

  test('the first Tab reaches the skip link', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    await expect(
      page.getByRole('link', { name: 'Skip to main content' }),
    ).toBeFocused()
  })
})
