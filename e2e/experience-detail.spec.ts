import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/** The experience detail screen at /experience/:id. */

const WCAG22AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PICNIC = '/experience/exp-rooftop-picnic'

test.describe('experience detail', () => {
  test('has no detectable WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto(PICNIC)
    await expect(page.getByRole('heading', { name: 'Rooftop Picnic Night' })).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])
  })

  /**
   * FULL BLEED. The hero reaches the very top and passes under the status
   * bar; the `bleed` chrome exists so the layout reserves nothing above it.
   * A regression here is a strip of background over the picture, which reads
   * as a broken image rather than as a layout bug.
   */
  test('runs the hero to the top of the screen', async ({ page }) => {
    await page.goto(PICNIC)
    const hero = page.locator('main div.h-70').first()
    await expect(hero).toBeVisible()

    const box = await hero.boundingBox()
    expect(box?.y).toBe(0)

    // And the nav bar floats over it rather than pushing it down.
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
    await expect(page.locator('header')).toBeVisible()
  })

  /**
   * Reserve is `Type=Split` — a commitment and its overflow as TWO hit
   * areas, which is the whole reason our Button is not the vendored one.
   * Flattening it into a single button would lose the overflow entirely.
   */
  test('reserve is two buttons, not one', async ({ page }) => {
    await page.goto(PICNIC)
    await expect(page.getByRole('button', { name: 'Reserve Now' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /More ways to book/ }),
    ).toBeVisible()
  })

  /**
   * Viewing records the experience, and this screen is what does it — the
   * card used to, which counted a tap rather than an arrival and missed
   * anyone coming in from a shared link. Landing here directly, as this test
   * does, is exactly the case the old behaviour could not see.
   */
  test('records the view on arrival, not on the tap that got here', async ({
    page,
  }) => {
    await page.goto(PICNIC)
    await expect(page.getByRole('heading', { name: 'Rooftop Picnic Night' })).toBeVisible()

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem('erge.recently-viewed.v1'),
        ),
      )
      .toContain('exp-rooftop-picnic')
  })

  /**
   * An experience that is gone says so. `not_found` is an answer, so the
   * screen must not retry it into a long spinner and must not render an
   * empty page that looks like a loading failure.
   */
  test('says so when the experience is gone', async ({ page }) => {
    await page.goto('/experience/exp-does-not-exist')
    await expect(page.getByText(/no longer listed/)).toBeVisible({
      timeout: 10_000,
    })
  })

  /** Absent and empty are the same thing: no section at all. */
  test('omits What’s Included when there is nothing to include', async ({
    page,
  }) => {
    await page.goto(PICNIC)
    await expect(page.getByRole('heading', { name: /What’s Included/ })).toBeVisible()

    await page.goto('/experience/exp-ride-to-dinner')
    await expect(page.getByRole('heading', { name: 'Ride to Dinner' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /What’s Included/ })).toHaveCount(0)
  })
})
