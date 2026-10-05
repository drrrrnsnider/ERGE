import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * The results screen at /search/results — a list of experiences over a map.
 */

const WCAG22AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const cards = '[data-slot="experience-card"][data-variant="media-lg"]'

test.describe('search results', () => {
  test('has no detectable WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])
  })

  /**
   * Results keeps the takeover chrome and draws its own summary bar instead.
   * That bar is the whole navigation of the screen — back out, edit the
   * query, change the location — so losing it would strand someone here.
   */
  test('replaces the app chrome with its own summary bar', async ({ page }) => {
    await page.goto('/search/results?q=picnic')
    await expect(page.locator('header')).toHaveCount(0)
    await expect(page.locator('search')).toHaveCount(0)

    // The query and the location are separately editable, not one label.
    await expect(page.getByRole('link', { name: /Edit search: picnic/ })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Change location/ }),
    ).toBeVisible()
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  /**
   * The filter lives in the URL, so a filtered list is a link someone can
   * send and a hard refresh lands on the same thing.
   */
  test('carries the category in the URL', async ({ page }) => {
    await page.goto('/search/results')
    /* Wait for the first card before counting. The mock is deliberately slow,
     * so counting straight after `goto` counts the skeletons' absence and
     * passes or fails on timing rather than on behaviour. */
    await expect(page.locator(cards).first()).toBeVisible()
    expect(await page.locator(cards).count()).toBeGreaterThan(1)

    await page.getByRole('button', { name: 'Dining' }).click()
    await expect(page).toHaveURL(/category=dining/)
    await expect(page.locator(cards)).toHaveCount(2)

    // And the same URL, arrived at cold, shows the same thing.
    await page.goto('/search/results?category=dining')
    await expect(page.locator(cards)).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Dining' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  /** A hand-edited category must not filter the screen down to nothing. */
  test('falls back to All on a category it does not know', async ({ page }) => {
    await page.goto('/search/results?category=not-a-real-category')
    await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator(cards).first()).toBeVisible()
  })

  /**
   * Every tab on the category row returns its own things.
   *
   * Drinks and Sports are the ones worth pinning: they had no home in
   * `ExperienceCategory` and the enum grew to fit them rather than folding
   * them into dining and event. The failure this guards against is someone
   * later "tidying" that by pointing them at a near-enough category, which
   * would show results and be wrong — so it checks WHAT comes back, not just
   * that something does.
   */
  test('each category returns its own experiences', async ({ page }) => {
    const cases = [
      { category: 'drinks', expect: /Cocktail Flight/ },
      { category: 'sports', expect: /Padel/ },
      { category: 'spa', expect: /Sound Bath/ },
    ]
    for (const one of cases) {
      await page.goto(`/search/results?category=${one.category}`)
      await expect(page.locator(cards)).toHaveCount(1)
      await expect(page.locator(cards).getByText(one.expect)).toBeVisible()
    }
  })

  /** And a category with nothing in it still says so rather than hanging. */
  test('shows an empty state when nothing matches', async ({ page }) => {
    await page.goto('/search/results?q=nothingwillevermatchthis')
    await expect(page.getByText('Nothing matched')).toBeVisible()
    await expect(page.locator(cards)).toHaveCount(0)
  })

  /**
   * "Right Now" is the one chip that is not a menu — no chevron in the
   * design, nothing to choose. It carries `aria-pressed`, not
   * `aria-haspopup`, and that difference is the point.
   */
  test('Right Now is a toggle, not a menu', async ({ page }) => {
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()
    const all = await page.locator(cards).count()

    const chip = page.getByRole('button', { name: 'Right Now' })
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await expect(chip).not.toHaveAttribute('aria-haspopup', /.*/)

    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(cards)).not.toHaveCount(all)
  })

  /**
   * Duration opens a sheet and choosing closes it — unlike the date range,
   * one tap finishes the job, so a Done button would be a tap that does
   * nothing.
   *
   * It does NOT guard the exit styling, and that is worth saying because it
   * looks as though it should. Base UI marks a dismissed surface
   * `data-closed` and leaves hiding it to the author; with no closed styling
   * the sheet stayed on screen in the browser, closed but visible. This test
   * still passes with that styling removed — Playwright tears the portal
   * down either way — so the styling in PickerSurface is guarded by nothing
   * but the comment on it.
   */
  test('a duration sheet closes when you choose', async ({ page }) => {
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()

    await page.getByRole('button', { name: /Duration/ }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()

    await sheet.getByRole('radio', { name: '1–2 hours' }).click()
    await expect(sheet).not.toBeVisible()
    // And the chip now says what it is filtering by.
    await expect(page.getByRole('button', { name: /1–2 hours/ })).toBeVisible()
  })

  /**
   * THE CEILING COMES FROM THE RESULTS. The budget track has to end at the
   * most expensive thing actually on offer, not at a number chosen in
   * advance — that is what `ceiling` in the response is for, and it is
   * computed before the budget narrows anything so it cannot collapse onto
   * the range already picked.
   */
  test('the budget track ends at the priciest result', async ({ page }) => {
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()

    await page.getByRole('button', { name: 'Any budget' }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()

    /* $340 is the dearest fixture. Asserted as a number rather than "not the
     * default" so that a ceiling silently falling back to the wide-open
     * sentinel fails here. */
    await expect(sheet.locator('input[type="range"]').nth(1)).toHaveAttribute(
      'max',
      '340',
    )
  })

  /**
   * The categories and filters pin BELOW the summary bar once the sheet
   * reaches the top. They used to pin to the top of the screen, where the
   * bar floats over them, so the whole header vanished at exactly the moment
   * it was meant to stay put.
   *
   * Hit-testing rather than comparing rectangles: what matters is that a
   * tap on "All" reaches "All", and a rectangle can be in the right place
   * while something else sits on top of it.
   */
  test('pins the filters below the summary bar, not under it', async ({
    page,
  }) => {
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()

    await page
      .locator(cards)
      .last()
      .evaluate((card) => card.scrollIntoView({ block: 'end' }))

    const all = page.getByRole('button', { name: 'All', exact: true })
    await expect(all).toBeInViewport()
    const reached = await all.evaluate((button) => {
      const r = button.getBoundingClientRect()
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return hit !== null && button.contains(hit)
    })
    expect(reached).toBe(true)
  })

  /**
   * WCAG 2.4.11 against the pinned header. Tabbing backwards up the list,
   * the browser scrolls each control just into view — and without
   * `scroll-padding-top` "into view" means the top edge of the scroller,
   * which is under a 116px opaque header. Measured before the fix: 7 of 24
   * controls fully hidden.
   *
   * `focus()` rather than Shift+Tab, because WebKit leaves links out of the
   * Tab order without macOS keyboard navigation (see the skip-link test) —
   * and the scroll-into-view this is testing is the same either way.
   */
  test('a control focused while tabbing backwards is not hidden under the filters', async ({
    page,
  }) => {
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()

    const obscured = await page
      .getByRole('group', { name: 'Category' })
      .evaluate(async (group) => {
        const header = group.parentElement!
        const scroller = header.closest('.overflow-y-auto')!
        scroller.scrollTop = scroller.scrollHeight

        const controls = [
          ...scroller.querySelectorAll<HTMLElement>('a[href], button'),
        ].filter((el) => !header.contains(el))

        const hidden: string[] = []
        for (const el of controls.reverse()) {
          el.focus()
          await new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          )
          const r = el.getBoundingClientRect()
          const h = header.getBoundingClientRect()
          if (r.top < h.bottom && r.bottom > h.top) {
            hidden.push(el.getAttribute('aria-label') ?? el.textContent ?? '')
          }
        }
        return hidden
      })

    expect(obscured).toEqual([])
  })

  /**
   * The map is decoration standing in for a provider that has not been
   * chosen. It must stay out of the accessibility tree and out of the tab
   * order — every result it represents is real text in the list below.
   */
  test('keeps the placeholder map out of the way of a screen reader', async ({
    page,
  }) => {
    await page.goto('/search/results')
    const map = page.locator('[data-slot="map-placeholder"]')
    await expect(map).toHaveAttribute('aria-hidden', 'true')
    await expect(map.locator('a, button')).toHaveCount(0)
  })
})
