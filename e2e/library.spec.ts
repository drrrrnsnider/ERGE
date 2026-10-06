import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** Library's saved list, at /library. */

const WCAG22AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Saves three experiences straight into the device's storage, with known
 * dates, so the newest-first order is known. Written after a first load
 * rather than by an init script: an init script would run again on every
 * reload and quietly undo whatever the test removed.
 */
async function seedSaved(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    const at = (day: string) => `2026-10-0${day}T10:00:00.000Z`
    localStorage.setItem(
      'erge.mock.saved.v1',
      JSON.stringify({
        collectionId: 'saved-this-device',
        kind: 'saved',
        active: true,
        /* Stored out of order on purpose, so newest-first is something
         * the list has to do rather than something it inherits. */
        items: [
          { experienceId: 'exp-sunset-sail', addedAt: at('2'), selected: false },
          { experienceId: 'exp-rooftop-picnic', addedAt: at('1'), selected: false },
          { experienceId: 'exp-ride-to-dinner', addedAt: at('3'), selected: false },
        ],
      }),
    )
  })
  await page.goto('/library')
  await expect(page.getByRole('list', { name: 'Saved experiences' })).toBeVisible()
}

const rows = (page: Page) =>
  page.getByRole('list', { name: 'Saved experiences' }).getByRole('listitem')

test.describe('library', () => {
  test('has no detectable WCAG 2.2 AA violations, full or empty', async ({ page }) => {
    await seedSaved(page)
    let results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])

    await page.evaluate(() => localStorage.removeItem('erge.mock.saved.v1'))
    await page.reload()
    await expect(page.getByText('Nothing saved yet')).toBeVisible()
    results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])
  })

  /** First run is empty, and the empty state says where to go. */
  test('a first run shows the empty state, pointing at Explore', async ({ page }) => {
    await page.goto('/library')
    await expect(page.getByText('Nothing saved yet')).toBeVisible()
    await page.getByRole('link', { name: 'Explore experiences' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('lists what was saved, newest first', async ({ page }) => {
    await seedSaved(page)
    await expect(rows(page)).toHaveText([
      /Ride to Dinner/,
      /Sunset Sail & Wine/,
      /Rooftop Picnic Night/,
    ])
  })

  /**
   * UNSAVING LEAVES A MESSAGE IN PLACE, AND UNDO PUTS IT BACK. The row does
   * not vanish under the thumb; it becomes "… was removed", focus moves to
   * Undo because the heart that had it is gone, and Undo brings the card
   * back in the same position with focus on its heart.
   */
  test('unsaving leaves "was removed" in place, and Undo restores it', async ({
    page,
  }) => {
    await seedSaved(page)
    await page.getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' }).click()

    const middle = rows(page).nth(1)
    await expect(middle).toContainText('Sunset Sail & Wine was removed')
    const undo = middle.getByRole('button', { name: /^Undo/ })
    await expect(undo).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Sunset Sail & Wine was removed')

    await undo.click()
    const heart = rows(page)
      .nth(1)
      .getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' })
    await expect(heart).toBeFocused()
    await expect(rows(page)).toHaveCount(3)
  })

  /** The message lasts only as long as the visit. */
  test('a removed experience is gone on the next visit', async ({ page }) => {
    await seedSaved(page)
    await page.getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' }).click()
    await expect(rows(page).nth(1)).toContainText('was removed')

    // Away and back in-app, as a person would, then a cold reload too.
    await page.getByRole('link', { name: 'Explore' }).click()
    await page.getByRole('link', { name: 'Library' }).click()
    await expect(rows(page)).toHaveText([/Ride to Dinner/, /Rooftop Picnic Night/])
    await page.reload()
    await expect(rows(page)).toHaveCount(2)
  })

  /**
   * THE TAB YOU STARTED FROM. The same experience lights Library when opened
   * from here and Explore when opened from a rail; Back restores Library.
   * Path alone would light Explore for both, which is what the tab bar did
   * before the tab travelled with navigation.
   */
  test('an experience opened from Library keeps Library lit', async ({ page }) => {
    await seedSaved(page)
    const tabs = page.getByRole('navigation', { name: 'Primary' })

    await page.getByRole('link', { name: 'Sunset Sail & Wine' }).click()
    await expect(page.getByRole('heading', { name: 'Sunset Sail & Wine' })).toBeVisible()
    await expect(tabs.getByRole('link', { name: 'Library' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(tabs.getByRole('link', { name: 'Explore' })).not.toHaveAttribute(
      'aria-current',
      /.*/,
    )

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(tabs.getByRole('link', { name: 'Library' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // The same experience from Explore's rails lights Explore instead.
    await tabs.getByRole('link', { name: 'Explore' }).click()
    await page.getByRole('link', { name: 'Sunset Sail & Wine' }).first().click()
    await expect(page.getByRole('heading', { name: 'Sunset Sail & Wine' })).toBeVisible()
    await expect(tabs.getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  /**
   * The pills are navigation, so they never opt down to compact — and the
   * theme's 44px floor does not reach links, so nothing else would catch a
   * pill shrinking to its drawn 32px. Asserted on every project: the target
   * is the full bar height everywhere, not only on a phone.
   */
  test('each section pill is a full-height target', async ({ page }) => {
    await page.goto('/library')
    const bar = page.getByRole('navigation', { name: 'Library sections' })
    await expect(bar.getByRole('link', { name: 'Experiences' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    for (const name of ['Experiences', 'Wishlists', 'Trips']) {
      const box = await bar.getByRole('link', { name }).boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
  })
})
