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

  /**
   * THE TILE CHANGES SHAPE, unless motion is reduced. The card is 80px and
   * the message shorter — 48, or more where the title wraps on a phone, so
   * it is measured rather than assumed. The moment the message appears its
   * box should still be taller than the message, easing down. Under reduced
   * motion there is no ease: it is the message's own height straight away.
   * Read on the first frame the message exists, well inside
   * Motion/Duration/Moderate.
   */
  for (const reduced of [false, true]) {
    test(`unsaving ${reduced ? 'snaps' : 'eases'} the tile to its new height${reduced ? ' under reduced motion' : ''}`, async ({
      page,
    }) => {
      if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
      await seedSaved(page)
      const item = page.locator('li[data-experience-id="exp-sunset-sail"]')
      await page.getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' }).click()
      await expect(item.locator('[data-slot="removed-row"]')).toBeVisible()

      /* The box's height, and the height of the message inside it. */
      const measure = () =>
        item.evaluate((el) => [
          el.getBoundingClientRect().height,
          el.firstElementChild!.getBoundingClientRect().height,
        ])

      const [box, message] = await measure()
      if (reduced) expect(box).toBe(message)
      else expect(box).toBeGreaterThan(message!)

      // Either way it settles on the message's own height.
      await expect.poll(async () => {
        const [b, m] = await measure()
        return b === m
      }).toBe(true)
    })
  }

  /**
   * THE COUNTDOWN. Undo sweeps from Primary to Muted over 6s, and the end of
   * that animation is what dismisses the row. Rather than wait six seconds
   * per project, these finish or inspect the animation directly — it IS the
   * timer, so finishing it is the same as the time running out.
   */
  /* The word's own countdown — not its underline's, which runs the same
   * animation on a ::after. `subtree` because it is on the word inside the
   * button, not the button. Written out twice rather than shared, because
   * code inside `evaluate` runs in the page and cannot see this file. */
  const countdown = (page: Page) =>
    page.locator('[data-slot="undo"]').evaluate((el) => {
      const run = el
        .getAnimations({ subtree: true })
        .find(
          (a) =>
            (a as CSSAnimation).animationName === 'countdown' &&
            !(a.effect as KeyframeEffect).pseudoElement,
        )
      return run ? run.playState : 'none'
    })
  const runOut = (page: Page) =>
    page.locator('[data-slot="undo"]').evaluate((el) => {
      el.getAnimations({ subtree: true })
        .find(
          (a) =>
            (a as CSSAnimation).animationName === 'countdown' &&
            !(a.effect as KeyframeEffect).pseudoElement,
        )
        ?.finish()
    })

  test('when the countdown runs out the row goes, and focus moves to the next', async ({
    page,
  }) => {
    await seedSaved(page)
    await page.getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' }).click()
    await expect(page.getByRole('button', { name: /^Undo/ })).toBeFocused()
    /* On desktop the pointer is still where the heart was, which is on top
     * of Undo — and a resting pointer pauses the countdown, by design. */
    await page.mouse.move(0, 0)
    expect(await countdown(page)).toBe('running')

    await runOut(page)
    await expect(rows(page)).toHaveText([/Ride to Dinner/, /Rooftop Picnic Night/])
    await expect(
      page.getByRole('button', { name: 'Remove Rooftop Picnic Night from saved' }),
    ).toBeFocused()
  })

  test('the last row running out leaves the empty state, with focus on its link', async ({
    page,
  }) => {
    await page.goto('/')
    await page.evaluate(() =>
      localStorage.setItem(
        'erge.mock.saved.v1',
        JSON.stringify({
          collectionId: 'saved-this-device',
          kind: 'saved',
          active: true,
          items: [{ experienceId: 'exp-sunset-sail', addedAt: '2026-10-01T10:00:00.000Z' }],
        }),
      ),
    )
    await page.goto('/library')
    await page.getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' }).click()
    await runOut(page)
    await expect(page.getByRole('link', { name: 'Explore experiences' })).toBeFocused()
  })

  /**
   * WCAG 2.2.1: a time limit someone can extend. The countdown pauses while
   * keyboard focus is on Undo — reached here by pressing Enter on the heart,
   * which moves focus as a keyboard action — and resumes when it leaves.
   */
  test('the countdown pauses while Undo has keyboard focus', async ({ page }) => {
    await seedSaved(page)
    await page.getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /^Undo/ })).toBeFocused()
    expect(await countdown(page)).toBe('paused')

    await page.keyboard.press('Tab')
    expect(await countdown(page)).toBe('running')
  })

  /** And while a pointer rests on it — desktop only, since hover is gated
   * on `(hover: hover)` and a phone has no resting pointer. */
  test('the countdown pauses under a resting pointer', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chrome', 'hover does not apply to touch')
    await seedSaved(page)
    await page.getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' }).click()
    await page.mouse.move(0, 0)
    expect(await countdown(page)).toBe('running')
    await page.getByRole('button', { name: /^Undo/ }).hover()
    expect(await countdown(page)).toBe('paused')
  })

  /** Reduced motion has no countdown at all: the message stays for the visit. */
  test('under reduced motion there is no countdown', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedSaved(page)
    await page.getByRole('button', { name: 'Remove Sunset Sail & Wine from saved' }).click()
    await expect(page.getByRole('button', { name: /^Undo/ })).toBeVisible()
    expect(await countdown(page)).toBe('none')
  })

  /**
   * EVERY LINE IS ONE LINE (option A). On the narrowest phone the tasting
   * menu's title and its "Wynwood, Miami, FL  •  2.5 hrs" both overflow. The
   * title is cut with "…", the PLACE gives way, and the duration stays whole
   * — and the tile stays the frame's 80px however long the words are.
   */
  test('a long title and meta stay one line each, and the duration survives', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/')
    await page.evaluate(() =>
      localStorage.setItem(
        'erge.mock.saved.v1',
        JSON.stringify({
          collectionId: 'saved-this-device',
          kind: 'saved',
          active: true,
          items: [{ experienceId: 'exp-tasting-menu', addedAt: '2026-10-01T10:00:00.000Z' }],
        }),
      ),
    )
    await page.goto('/library')
    const card = page.locator('[data-slot="experience-card"]').first()
    await expect(card).toBeVisible()

    const shape = await card.evaluate((el) => {
      const title = el.querySelector('a')!
      const [place, duration] = el.querySelector('p')!.children as unknown as HTMLElement[]
      return {
        height: el.getBoundingClientRect().height,
        titleCut: title.scrollWidth > title.clientWidth,
        placeCut: place!.scrollWidth > place!.clientWidth,
        durationWhole: duration!.scrollWidth <= duration!.clientWidth,
        duration: duration!.textContent,
      }
    })
    expect(shape).toEqual({
      height: 80,
      titleCut: true,
      placeCut: true,
      durationWhole: true,
      duration: expect.stringMatching(/2\.5 hrs$/),
    })
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

test.describe('library wishlists', () => {
  /** Wishlists written straight to the device — nothing in the app makes
   * one yet (they come from the experience page, not built). Their
   * experiences are saved as well: a wishlist only shows what is saved. */
  async function seedWishlists(page: Page) {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem(
        'erge.mock.saved.v1',
        JSON.stringify({
          collectionId: 'saved-this-device',
          kind: 'saved',
          active: true,
          items: ['exp-rooftop-picnic', 'exp-tasting-menu', 'exp-sunset-sail', 'exp-jazz-club'].map(
            (experienceId) => ({ experienceId, addedAt: '2026-09-01T10:00:00.000Z' }),
          ),
        }),
      )
      const at = (day: string) => `2026-10-0${day}T10:00:00.000Z`
      const wishlist = (id: string, name: string, ids: string[]) => ({
        collectionId: id,
        kind: 'wishlist',
        active: true,
        name,
        items: ids.map((experienceId, i) => ({ experienceId, addedAt: at(String(i + 1)) })),
      })
      localStorage.setItem(
        'erge.mock.wishlists.v1',
        JSON.stringify([
          wishlist('wl-dinners', 'Dinners & Views', [
            'exp-rooftop-picnic',
            'exp-tasting-menu',
            'exp-sunset-sail',
          ]),
          wishlist('wl-one', 'Birthday', ['exp-jazz-club']),
          wishlist('wl-empty', 'Someday', []),
        ]),
      )
    })
    await page.goto('/library/wishlists')
  }

  const grid = (page: Page) => page.getByRole('list', { name: 'Wishlists' })

  test('has no detectable WCAG 2.2 AA violations, full or empty', async ({ page }) => {
    await seedWishlists(page)
    await expect(grid(page)).toBeVisible()
    let results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])

    await page.evaluate(() => localStorage.removeItem('erge.mock.wishlists.v1'))
    await page.reload()
    await expect(page.getByText('No wishlists yet')).toBeVisible()
    results = await new AxeBuilder({ page }).withTags(WCAG22AA).analyze()
    expect(results.violations).toEqual([])
  })

  /** First run has none, and nothing seeds them — the empty state is real. */
  test('a first run shows the empty state under the same title and pills', async ({
    page,
  }) => {
    await page.goto('/library/wishlists')
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Library sections' }).getByRole('link', {
        name: 'Wishlists',
      }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('No wishlists yet')).toBeVisible()
  })

  test('lists each wishlist with its count, and opens it', async ({ page }) => {
    await seedWishlists(page)
    await expect(grid(page).getByRole('listitem')).toHaveText([
      /Dinners & Views\s*3 Experiences/,
      /Birthday\s*1 Experience$/,
      /Someday\s*0 Experiences/,
    ])
    await grid(page).getByRole('link', { name: /Dinners & Views/ }).click()
    await expect(page).toHaveURL(/\/library\/wishlists\/wl-dinners$/)
    // Not built yet, but still inside Library.
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Library' }),
    ).toHaveAttribute('aria-current', 'true')
  })

  /** Two columns, 16px apart both ways, at the frame's width. */
  test('draws a two-column grid with 16px gaps', async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 })
    await seedWishlists(page)
    await expect(grid(page).getByRole('listitem')).toHaveCount(3)
    const boxes = await grid(page)
      .getByRole('listitem')
      .evaluateAll((items) => items.map((li) => li.getBoundingClientRect().toJSON()))
    const [a, b, c] = boxes as DOMRect[]
    expect(Math.round(a!.width)).toBe(177)
    expect(Math.round(b!.left - a!.right)).toBe(16)
    expect(Math.round(c!.top - a!.bottom)).toBe(16)
  })
})
