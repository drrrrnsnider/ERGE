import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * The search takeover at /search.
 *
 * Its own file rather than more cases in accessibility.spec.ts, because most
 * of what is worth testing here is behaviour over time — a search that is
 * still there next launch — rather than a scan of one render.
 */

const WCAG22AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Seed storage before the app boots, as a previous session would have. */
async function seedRecents(page: Page, searches: string[], viewed: string[]) {
  await page.addInitScript(
    ([s, v]) => {
      window.localStorage.setItem('erge.recent-searches.v1', JSON.stringify(s))
      window.localStorage.setItem('erge.recently-viewed.v1', JSON.stringify(v))
    },
    [searches, viewed] as const,
  )
}

test.describe('the search takeover', () => {
  test('has no detectable WCAG 2.2 AA violations', async ({ page }) => {
    await seedRecents(page, ['Jetski', 'Date Night'], ['exp-sunset-sail'])
    await page.goto('/search')
    await expect(page.getByRole('heading', { name: 'Recently viewed' })).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])
  })

  /**
   * The takeover is a takeover: no top bar, no bottom search row, tab bar
   * kept. That is the whole point of `RootLayout chrome="takeover"`, and it
   * is one prop away from silently reverting.
   */
  test('drops the app chrome but keeps the tabs', async ({ page }) => {
    await page.goto('/search')
    await expect(page.locator('header')).toHaveCount(0)
    await expect(page.locator('search')).toHaveCount(0)
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  /** And the screens that are not the takeover still have it. */
  test('leaves the chrome alone everywhere else', async ({ page }) => {
    await page.goto('/search/results?q=jetski')
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('search')).toBeVisible()
  })

  /**
   * The round trip that makes recents worth having: search, leave, come back
   * in a NEW page, and find it waiting. A test that only checked the list
   * updated in place would pass with no storage at all.
   */
  test('remembers a search into the next session', async ({ page, context }) => {
    await page.goto('/search')
    await page.getByRole('searchbox', { name: 'Search experiences' }).fill('Rooftop bars')
    await page.getByRole('searchbox', { name: 'Search experiences' }).press('Enter')
    await expect(page).toHaveURL(/\/search\/results\?q=Rooftop%20bars/)

    const later = await context.newPage()
    await later.goto('/search')
    await expect(
      later.getByRole('link', { name: 'Rooftop bars' }),
    ).toBeVisible()
    await later.close()
  })

  test('a recent search chip runs that search again', async ({ page }) => {
    await seedRecents(page, ['Jetski'], [])
    await page.goto('/search')
    await page.getByRole('link', { name: 'Jetski' }).click()
    await expect(page).toHaveURL(/\/search\/results\?q=Jetski/)
  })

  /**
   * Recently viewed stores ids, so an experience that has gone away since
   * must drop out of the list rather than rendering as a blank row. The
   * seed deliberately contains one id that does not exist.
   */
  test('skips a recently viewed experience that no longer exists', async ({
    page,
  }) => {
    await seedRecents(page, [], ['exp-sunset-sail', 'exp-gone', 'exp-jazz-club'])
    await page.goto('/search')
    const cards = page.locator('[data-slot="experience-card"][data-variant="media-xs"]')
    await expect(cards).toHaveCount(2)
  })

  /**
   * WCAG 2.4.11 / 2.4.13 — the focus ring on a control INSIDE the pill.
   *
   * This is the test that was owed when FieldAction was built and had no
   * call site. FieldPill's content wrapper used to carry `overflow-clip`,
   * and because a child filling the pill's height is flush with that box top
   * and bottom, the horizontal runs of the ring fell outside the clip: what
   * survived was two vertical bars, which does not read as a focus
   * indicator. Asserting the ring's full rectangle is painted inside every
   * ancestor that could clip it is what stops that coming back.
   */
  test('a focused control inside a pill shows its whole ring', async ({
    page,
  }, testInfo) => {
    await page.goto('/search')
    /* The LOCATION action, not the date one. That matters: "Today" sits in
     * the pill's `action` slot, which is outside the wrapper that does the
     * clipping, so pointing this test at it made it pass with the bug put
     * back. The control has to be inside the pill's content. */
    const today = page.getByRole('link', { name: /Change location/ })

    /* THE GEOMETRY, on every engine. The ring's size comes from the tokens
     * theme.css draws it with rather than from a painted outline, because
     * whether a browser paints one depends on focus behaviour that differs
     * per engine — and the bug being guarded here is not about focus at all.
     * It is that an ancestor's `overflow` clips the rectangle the ring will
     * occupy. That is true or false whatever has focus. */
    const clipped = await today.evaluate((el) => {
      const root = window.getComputedStyle(document.documentElement)
      const rem = parseFloat(window.getComputedStyle(document.body).fontSize) || 16
      const toPx = (value: string) =>
        value.trim().endsWith('rem')
          ? parseFloat(value) * rem
          : parseFloat(value) || 0
      const reach =
        toPx(root.getPropertyValue('--size-focus-ring')) +
        toPx(root.getPropertyValue('--size-focus-offset'))

      const box = el.getBoundingClientRect()
      const ring = {
        top: box.top - reach,
        bottom: box.bottom + reach,
        left: box.left - reach,
        right: box.right + reach,
      }

      for (let node = el.parentElement; node; node = node.parentElement) {
        const s = window.getComputedStyle(node)
        // `visible` does not clip; a scroll container can scroll it into view.
        if (s.overflow !== 'hidden' && s.overflow !== 'clip') continue
        const r = node.getBoundingClientRect()
        if (
          ring.top < r.top ||
          ring.bottom > r.bottom ||
          ring.left < r.left ||
          ring.right > r.right
        ) {
          return { by: node.className || node.tagName, overflow: s.overflow }
        }
      }
      return null
    })
    expect(clipped).toBeNull()

    /* THE PAINT, on Chromium only. WebKit leaves buttons out of the Tab
     * sequence unless macOS full keyboard access is on — the same platform
     * quirk the skip-link test documents — so it cannot reach this control
     * by keyboard at all, and `:focus-visible` never matches.
     *
     * This half is not decoration. The first version of this test used a
     * programmatic `.focus()`, found no outline because `:focus-visible`
     * does not match one, computed a reach of zero, and reported that the
     * zero-sized ring was not clipped — it passed with the bug deliberately
     * put back. Measuring a ring that is really painted is what stops that. */
    if (testInfo.project.name !== 'mobile-safari') {
      await today.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await expect(today).toBeFocused()


      const painted = await today.evaluate((el) => {
        const s = window.getComputedStyle(el)
        return s.outlineStyle === 'none' ? 0 : parseFloat(s.outlineWidth) || 0
      })
      expect(painted).toBeGreaterThan(0)
    }
  })
})
