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

  test('the first Tab reaches the skip link', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    await expect(
      page.getByRole('link', { name: 'Skip to main content' }),
    ).toBeFocused()
  })
})
