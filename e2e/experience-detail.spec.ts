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

  /**
   * "Complete the Experience": this experience and its pairings as one
   * band, the anchor in the first column, and both the band and the flow
   * button handing the evening to the concierge.
   *
   * The anchor is put first by the screen, not the API — the pairings call
   * returns companions only — so this is the test that holds that line. The
   * band is photos, so its link carries the titles as its name; scanned with
   * axe once it has rendered, since the page-level scan above can finish
   * before the pairings arrive.
   */
  test('completes the experience with this one first', async ({ page }) => {
    await page.goto(PICNIC)
    const section = page.getByRole('region', { name: 'Complete the Experience' })
    const band = section.getByRole('link', { name: /^Build this evening with the concierge/ })
    await expect(band).toBeVisible()

    await expect(band).toHaveAccessibleName(
      'Build this evening with the concierge: Rooftop Picnic Night, Cocktail Flight at Sugarcane, Late Set at the Blue Door, Ride to Dinner',
    )
    await expect(band.locator('li')).toHaveCount(4)
    await expect(band.locator('li').first().locator('img')).toHaveAttribute(
      'alt',
      'A blanket and lanterns on a rooftop at dusk',
    )
    // Ride to Dinner has no photo, and still holds its column.
    await expect(band.locator('li').last().locator('img')).toHaveCount(0)

    const concierge = '/concierge?anchor=exp-rooftop-picnic'
    await expect(band).toHaveAttribute('href', concierge)
    await expect(
      section.getByRole('link', { name: 'Build a trip with concierge' }),
    ).toHaveAttribute('href', concierge)

    const results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])
  })

  /**
   * The pairings are their own call with their own failure, and the
   * houseboat's mock fails on purpose. The section says so and offers a
   * retry; the experience above it is untouched.
   */
  test('a failed suggestion stays inside its section', async ({ page }) => {
    await page.goto('/experience/exp-houseboat')
    const section = page.getByRole('region', { name: 'Complete the Experience' })
    await expect(section.getByText(/took too long/)).toBeVisible({ timeout: 15_000 })
    await expect(section.getByRole('button', { name: /try again/i })).toBeVisible()

    await expect(page.getByRole('heading', { level: 1, name: 'A Night on a Houseboat' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reserve Now' })).toBeVisible()
  })

  /**
   * Nothing pairs with the glass cabin, and that is an answer: no heading,
   * no empty state, no section. The section is on screen while the call is
   * in flight, so this waits for it to go rather than catching the moment
   * before it arrives.
   */
  test('leaves the section out when nothing pairs', async ({ page }) => {
    await page.goto('/experience/exp-glass-cabin')
    await expect(page.getByRole('heading', { level: 1, name: 'Glass Cabin in the Keys' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Complete the Experience' })).toHaveCount(0)
    // The concierge is still offered, by the flow button under Reserve.
    await expect(page.getByRole('link', { name: 'Build a trip with concierge' })).toHaveCount(1)
  })
})
