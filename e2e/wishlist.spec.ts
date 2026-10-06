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
    /* The screen answers before each save lands, and the hard `goto` at the
     * end would abandon one in flight — which no tap inside the app can do.
     * So wait for each write in turn: first the delete, then the Undo.
     * Checking only "contains Sunset Sail" at the end could pass on the
     * value from before the delete was ever written. */
    const stored = () => page.evaluate(() => localStorage.getItem('erge.mock.saved.v1') ?? '')

    await page.getByRole('button', { name: 'More options for Sunset Sail & Wine' }).click()
    await page.getByRole('menuitem', { name: 'Delete from Library' }).click()
    await expect(sunset(page)).toContainText('was deleted from your Library')
    await expect.poll(stored).not.toContain('exp-sunset-sail')

    await sunset(page).getByRole('button', { name: /^Undo/ }).click()
    await expect(
      sunset(page).getByRole('button', { name: 'Remove Sunset Sail & Wine…' }),
    ).toBeFocused()
    await expect(pills(page).getByRole('link').first()).toHaveText('Wishlist (3)')
    await expect.poll(stored).toContain('exp-sunset-sail')

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

  /**
   * ONE HEIGHT, whatever the title. Sunset Sail's title is one line and the
   * tasting menu's two, at the frame's width; every row is still the same —
   * text pinned to the top, Add to Cart to the bottom — so the buttons line
   * up down the list. 155 under a mouse, as drawn; 167 on a phone, where
   * the button is 44 rather than 32.
   */
  test('every row is one height, with Add to Cart at the bottom', async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 })
    await seed(page)
    const shapes = await page
      .locator('[data-variant="media-sm-full"]')
      .evaluateAll((cards) =>
        cards.map((card) => {
          const box = card.getBoundingClientRect()
          const button = card.querySelector('[data-slot="button-split"]')!.getBoundingClientRect()
          const title = card.querySelector('a')!.getBoundingClientRect()
          return {
            height: Math.round(box.height),
            buttonFromBottom: Math.round(box.bottom - button.bottom),
            titleLines: Math.round(title.height / 20),
          }
        }),
      )
    // Both kinds of title are present, or this proves nothing.
    expect(new Set(shapes.map((s) => s.titleLines))).toEqual(new Set([1, 2]))
    const expected = test.info().project.name === 'desktop-chrome' ? 155 : 167
    for (const shape of shapes) {
      expect(shape.height).toBe(expected)
      expect(shape.buttonFromBottom).toBe(12)
    }
  })

  /**
   * SUGGESTED ADDITIONS: what else might go in this wishlist — never
   * something already in it — each card opening its experience, and the
   * concierge handed the wishlist for more.
   */
  test('suggests what is not already in the wishlist', async ({ page }) => {
    await seed(page)
    const section = page.getByRole('region', { name: 'Suggested additions' })
    const cards = section.locator('[data-variant="media-sm-narrow"]')
    await expect(cards.first()).toBeVisible()

    const titles = await cards.locator('a').allTextContents()
    expect(titles.length).toBeGreaterThan(0)
    for (const inIt of ['Sunset Sail & Wine', 'Rooftop Picnic Night']) {
      expect(titles).not.toContain(inIt)
    }
    await expect(
      section.getByRole('link', { name: 'Discover more using concierge' }),
    ).toHaveAttribute('href', '/concierge?collection=wl-dinners')

    await cards.locator('a').first().click()
    await expect(page).toHaveURL(/\/experience\//)
  })

  /** Nothing left to suggest is an answer: no section, not an empty one. */
  test('leaves the section out when there is nothing to suggest', async ({ page }) => {
    await seed(page)
    await page.evaluate(async () => {
      /* Every fixture into the wishlist, so there is nothing left. */
      const all = [
        'exp-rooftop-picnic', 'exp-sunset-sail', 'exp-tasting-menu', 'exp-jazz-club',
        'exp-rooftop-cocktails', 'exp-padel-court', 'exp-sound-bath', 'exp-ride-to-dinner',
        'exp-bouquet', 'exp-houseboat', 'exp-glass-cabin', 'exp-everglades',
      ]
      const items = all.map((experienceId) => ({ experienceId, addedAt: '2026-10-01T10:00:00.000Z' }))
      localStorage.setItem(
        'erge.mock.saved.v1',
        JSON.stringify({ collectionId: 'saved-this-device', kind: 'saved', active: true, items }),
      )
      localStorage.setItem(
        'erge.mock.wishlists.v1',
        JSON.stringify([
          { collectionId: 'wl-dinners', kind: 'wishlist', active: true, name: 'Everything', items },
        ]),
      )
    })
    await page.reload()
    await expect(rows(page)).toHaveCount(12)
    // Give the suggestions call time to answer, then check it said nothing.
    await page.waitForTimeout(600)
    await expect(page.getByRole('region', { name: 'Suggested additions' })).toHaveCount(0)
  })

  test('the Purchased view has no suggestions', async ({ page }) => {
    await seed(page)
    await pills(page).getByRole('link', { name: 'Purchased (0)' }).click()
    await expect(page.getByText('Nothing gifted yet')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Suggested additions' })).toHaveCount(0)
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
