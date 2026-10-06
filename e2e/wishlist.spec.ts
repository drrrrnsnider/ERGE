import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** One wishlist's page, at /library/wishlists/:id. */

const WCAG22AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/library/wishlists/wl-dinners'

/**
 * Three saved experiences in one wishlist, Sunset Sail newest. Written to
 * the device after a first load, because nothing in the app creates a
 * wishlist yet — they come from the experience page, which is not built.
 */
async function seed(page: Page) {
  /* Reduced motion, so the Undo countdown does not run: these tests are
   * about what Undo puts back, and under a loaded parallel run the 6s
   * countdown could dismiss a row before the test reaches it. The countdown
   * itself is tested in library.spec.ts. */
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.evaluate(() => {
    const ids = ['exp-rooftop-picnic', 'exp-tasting-menu', 'exp-sunset-sail']
    localStorage.setItem(
      'erge.mock.saved.v1',
      JSON.stringify({
        collectionId: 'saved-this-device',
        kind: 'saved',
        active: true,
        /* Saved in the OPPOSITE order to the wishlist — Sunset Sail first,
         * so it is the oldest save and sits last on the Saved tab. That is
         * what tells a true Undo (its old place) from a fresh save (top). */
        items: ids.map((experienceId, i) => ({
          experienceId,
          addedAt: `2026-09-0${3 - i}T10:00:00.000Z`,
        })),
      }),
    )
    localStorage.setItem(
      'erge.mock.wishlists.v1',
      JSON.stringify([
        {
          collectionId: 'wl-dinners',
          kind: 'wishlist',
          active: true,
          name: 'Dinners & Views',
          items: ids.map((experienceId, i) => ({
            experienceId,
            addedAt: `2026-10-0${i + 1}T10:00:00.000Z`,
          })),
        },
      ]),
    )
  })
  await page.goto(PAGE)
  await expect(page.getByRole('list', { name: 'Wishlist' })).toBeVisible()
}

const rows = (page: Page) => page.getByRole('list', { name: 'Wishlist' }).getByRole('listitem')
const sunset = (page: Page) => page.locator('li[data-experience-id="exp-sunset-sail"]')
const pills = (page: Page) => page.getByRole('navigation', { name: 'Wishlist sections' })

test.describe('a wishlist', () => {
  test('has no detectable WCAG 2.2 AA violations, with and without a menu open', async ({
    page,
  }) => {
    await seed(page)
    let results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])

    /* With a menu open, scan the menu. The page behind it is dimmed on
     * purpose and cannot be used until the menu closes — focus is held in
     * the menu, and a tap outside dismisses it — so axe measuring the dimmed
     * text's contrast would be measuring something nobody can act on. */
    await page.getByRole('button', { name: 'More options for Sunset Sail & Wine' }).click()
    /* Fully faded in first: the menu fades over Motion/Duration/Fast, and
     * scanned mid-fade its text is still part-transparent and reads as low
     * contrast — measured once as 2.97 for "Delete from Library", which is
     * 4.5+ at rest (tokens.test.ts). */
    await expect(page.getByRole('menu')).toHaveCSS('opacity', '1')
    results = await new AxeBuilder({ page })
      .include('[role="menu"]')
      .withTags(WCAG22AA)
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('shows its name, its counts, and its experiences newest first', async ({ page }) => {
    await seed(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Dinners & Views' })).toBeVisible()
    await expect(pills(page).getByRole('link')).toHaveText(['Wishlist (3)', 'Purchased (0)'])
    await expect(rows(page)).toHaveText([/Sunset Sail/, /Seven-Course/, /Rooftop Picnic/])
  })

  /**
   * THE HEART ASKS. Everything here is saved, so the heart is filled — and
   * "remove" could mean this wishlist or the whole Library, so it offers
   * both rather than guessing (Darrin, 2026-10-06).
   */
  test('the heart asks, and Remove from Wishlist leaves it saved', async ({ page }) => {
    await seed(page)
    await page.getByRole('button', { name: 'Remove Sunset Sail & Wine…' }).click()
    await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText([
      'Remove from Wishlist',
      'Delete from Library',
    ])
    await page.getByRole('menuitem', { name: 'Remove from Wishlist' }).click()

    await expect(sunset(page)).toContainText('Sunset Sail & Wine was removed from this wishlist')
    await expect(sunset(page).getByRole('button', { name: /^Undo/ })).toBeFocused()
    await expect(pills(page).getByRole('link').first()).toHaveText('Wishlist (2)')

    // Still saved: the Saved tab lists it.
    await page.goto('/library')
    await expect(page.getByRole('list', { name: 'Saved experiences' })).toContainText(
      'Sunset Sail & Wine',
    )
  })

  /**
   * DELETE FROM LIBRARY is the other way out, from the row's "•••": unsaved,
   * and so out of every wishlist. Undo puts it back in both at once — the
   * membership was hidden, never deleted (api-contract.md).
   */
  test('Delete from Library unsaves it, and Undo restores it everywhere', async ({ page }) => {
    await seed(page)
    await page.getByRole('button', { name: 'More options for Sunset Sail & Wine' }).click()
    await page.getByRole('menuitem', { name: 'Delete from Library' }).click()
    await expect(sunset(page)).toContainText('was deleted from your Library')

    await sunset(page).getByRole('button', { name: /^Undo/ }).click()
    await expect(
      sunset(page).getByRole('button', { name: 'Remove Sunset Sail & Wine…' }),
    ).toBeFocused()
    await expect(pills(page).getByRole('link').first()).toHaveText('Wishlist (3)')

    /* The screen answers before the save lands; a hard `goto` would abandon
     * it in flight, which no tap inside the app can do. Wait for the write. */
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('erge.mock.saved.v1') ?? ''))
      .toContain('exp-sunset-sail')
    /* Back in its OLD place — last, the oldest save — not at the top, which
     * is where a fresh save would put it. That is the difference between
     * restoring the save and merely saving it again. */
    await page.goto('/library')
    await expect(
      page.getByRole('list', { name: 'Saved experiences' }).getByRole('listitem').last(),
    ).toContainText('Sunset Sail & Wine')
  })

  test('a deleted experience is gone from Library and from the wishlist count', async ({
    page,
  }) => {
    await seed(page)
    await page.getByRole('button', { name: 'More options for Sunset Sail & Wine' }).click()
    await page.getByRole('menuitem', { name: 'Delete from Library' }).click()
    await expect(sunset(page)).toContainText('was deleted from your Library')
    /* Let the write land before leaving — the heart answers first. */
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('erge.mock.saved.v1') ?? ''),
      )
      .not.toContain('exp-sunset-sail')

    await page.goto('/library')
    await expect(page.getByRole('list', { name: 'Saved experiences' })).not.toContainText(
      'Sunset Sail & Wine',
    )
    await page.goto('/library/wishlists')
    await expect(page.getByRole('list', { name: 'Wishlists' })).toContainText('2 Experiences')
  })

  /** Base UI's menu, used by keyboard: open, move, close, focus returns. */
  test('a menu works by keyboard and gives focus back', async ({ page }) => {
    await seed(page)
    const trigger = page.getByRole('button', { name: 'More options for Sunset Sail & Wine' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem').filter({ has: page.locator(':focus') }).or(
      page.locator('[role=menuitem]:focus'),
    )).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  /** Real actions, so full-size targets on a phone. */
  test('menu items are 44px tall on a coarse pointer', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop-chrome', 'coarse pointers only')
    await seed(page)
    await page.getByRole('button', { name: 'More options for Sunset Sail & Wine' }).click()
    const heights = await page
      .getByRole('menuitem')
      .evaluateAll((items) => items.map((i) => i.getBoundingClientRect().height))
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44)
  })

  test('Purchased is its own view, empty until gifting exists', async ({ page }) => {
    await seed(page)
    await pills(page).getByRole('link', { name: 'Purchased (0)' }).click()
    await expect(page).toHaveURL(/\/library\/wishlists\/wl-dinners\/purchased$/)
    await expect(page.getByText('Nothing gifted yet')).toBeVisible()
  })

  test('a wishlist that does not exist says so', async ({ page }) => {
    await page.goto('/library/wishlists/nope')
    await expect(page.getByText('This wishlist is gone')).toBeVisible()
  })

  /** Opened cold — a shared link — Back stays in the app. */
  test('Back from a cold link goes to the wishlists', async ({ page }) => {
    await seed(page)
    await page.goto(PAGE)
    await page.evaluate(() => history.replaceState(null, ''))
    await page.reload()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/library\/wishlists$/)
  })
})
