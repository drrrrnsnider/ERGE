import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Horizontal rails, and the per-section state model.
 *
 * Carousels are a common accessibility failure, and the approach taken in
 * src/components/app/rail.tsx is to build as little as possible: a native
 * scroll container with CSS scroll-snap, no key handlers, no roving
 * tabindex. That is only a good approach if it actually works, so the claims
 * are asserted here rather than left as comments in the component.
 *
 * These run in every project. The rail behaves the same on desktop and
 * mobile — only the target sizing differs, and that is asserted elsewhere.
 */

const WCAG22AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const RAIL = '[data-slot="rail-scroller"]'
const CARD = '[data-slot="experience-card"]'

/** Wait for at least one rail to have real cards rather than skeletons. */
async function firstPopulatedRail(page: import('@playwright/test').Page) {
  await page.goto('/')
  const rail = page.locator(RAIL).filter({ has: page.locator(CARD) }).first()
  await expect(rail.locator(CARD).first()).toBeVisible()
  return rail
}

/**
 * Wait for a scroller to stop moving.
 *
 * Naively comparing scrollLeft to its previous value exits after ONE frame,
 * because a smooth scroll has not visibly started yet — the number is still
 * its old value, looks stable, and the caller concludes nothing happened.
 * That produced a WebKit "failure" that was purely a measurement artifact.
 * Require several consecutive stable frames instead.
 */
async function settle(rail: import('@playwright/test').Locator) {
  return rail.evaluate(async (el) => {
    let previous = el.scrollLeft
    let stableFrames = 0
    for (let f = 0; f < 150 && stableFrames < 6; f++) {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      if (el.scrollLeft === previous) {
        stableFrames++
      } else {
        stableFrames = 0
        previous = el.scrollLeft
      }
    }
    const active = document.activeElement
    return {
      scrollLeft: el.scrollLeft,
      inside: !!active && el.contains(active),
    }
  })
}

test.describe('rails', () => {
  /**
   * The failure this is really about: a card you can Tab to but cannot see.
   * Tabbing through a horizontal scroller has to bring the focused card into
   * view, and `scroll-snap-type: mandatory` has a history of fighting the
   * browser's native scroll-into-view. So this asserts the scroller actually
   * moved AND that the focused card ended up inside its box.
   */
  /**
   * The failure this is really about: a card you can reach but cannot see.
   *
   * Asserted differently per engine, for the same reason the skip-link test
   * is (see e2e/accessibility.spec.ts). WebKit keeps links out of the tab
   * sequence, AND a programmatic `.focus()` does not set its sequential-focus
   * starting point — so `focus()` then Tab restarts at the top of the
   * document and never enters the rail at all. That is an automation limit,
   * not a rail defect: focusing an off-screen card scrolls it into view in
   * WebKit exactly as it does in Chromium, which is what the WebKit branch
   * below asserts directly.
   *
   * Chromium therefore asserts the whole journey — tab along the rail and
   * watch it scroll — and WebKit asserts the property that journey exists to
   * produce. Both are hard assertions; neither is skipped.
   */
  test('a focused off-screen card is scrolled into view', async ({
    page,
    browserName,
  }) => {
    /* A phone-width viewport in every project, so the rail genuinely
     * overflows. At desktop width the cards fit, there is nothing to scroll,
     * and the test would pass while proving nothing. */
    await page.setViewportSize({ width: 390, height: 800 })

    const rail = await firstPopulatedRail(page)

    // The premise. If a layout change stops the rail overflowing, this fails
    // loudly rather than leaving the assertion below vacuously true.
    const overflows = await rail.evaluate(
      (el) => el.scrollWidth > el.clientWidth + 1,
    )
    expect(overflows).toBe(true)

    const startScroll = await rail.evaluate((el) => el.scrollLeft)

    if (browserName === 'chromium') {
      /* Tab one step at a time, letting the scroll SETTLE after each. The
       * scroller is `scroll-smooth`, so reading scrollLeft straight after a
       * keypress races the animation and reports a pending scroll as none. */
      await rail.locator('button, a').first().focus()

      let moved = startScroll
      let insideRail = true
      for (let i = 0; i < 12 && moved === startScroll && insideRail; i++) {
        await page.keyboard.press('Tab')
        const state = await settle(rail)
        moved = state.scrollLeft
        insideRail = state.inside
      }
      expect(
        moved,
        'the rail never scrolled while tabbing through it',
      ).toBeGreaterThan(startScroll)
    } else {
      // Focus the third card directly — far enough along to be off-screen.
      await rail.locator('[data-slot="experience-card"] a').nth(2).focus()
      const state = await settle(rail)
      expect(
        state.scrollLeft,
        'focusing an off-screen card did not scroll it into view',
      ).toBeGreaterThan(startScroll)
    }

    // Either way, the focused element ends up visible inside the scroller.
    const visible = await rail.evaluate((el) => {
      const active = document.activeElement
      if (!active || !el.contains(active))
        return { ok: false, why: 'focus left the rail' }

      const r = active.getBoundingClientRect()
      const s = el.getBoundingClientRect()
      return {
        ok: r.left >= s.left - 1 && r.right <= s.right + 1,
        why: `focused ${active.tagName.toLowerCase()} at ${Math.round(r.left)}..${Math.round(r.right)}, rail ${Math.round(s.left)}..${Math.round(s.right)}`,
      }
    })
    expect(visible.ok, visible.why).toBe(true)
  })

  /**
   * Not a keyboard trap. The component adds no key handlers, so this should
   * be true by construction — but "should be" is how traps ship. Tab enough
   * times from inside a rail and focus must end up outside it.
   */
  test('a rail is not a keyboard trap', async ({ page }) => {
    const rail = await firstPopulatedRail(page)
    // A button, for the same WebKit reason as above.
    await rail.locator('button, a').first().focus()

    const cardCount = await rail.locator(CARD).count()
    // Generous: every card, its save button, and headroom.
    for (let i = 0; i < cardCount * 2 + 6; i++) {
      const stillInside = await rail.evaluate(
        (el) => !!document.activeElement && el.contains(document.activeElement),
      )
      if (!stillInside) break
      await page.keyboard.press('Tab')
    }

    const escaped = await rail.evaluate(
      (el) => !document.activeElement || !el.contains(document.activeElement),
    )
    expect(escaped).toBe(true)
  })

  /**
   * Scroll-snap is what makes the rail land on a card rather than halfway
   * through one. Asserted as computed style because it is easy to lose in a
   * refactor and invisible when it goes.
   */
  test('the scroller uses scroll-snap', async ({ page }) => {
    const rail = await firstPopulatedRail(page)
    const snap = await rail.evaluate((el) => ({
      type: getComputedStyle(el).scrollSnapType,
      item: getComputedStyle(el.querySelector('li') as Element).scrollSnapAlign,
    }))
    expect(snap.type).toContain('x')
    expect(snap.item).toContain('start')
  })

  /**
   * The scroller must be reachable by keyboard. It is not focusable itself —
   * every card inside it is a link, which is what satisfies this — so axe's
   * `scrollable-region-focusable` should stay quiet. If a rail ever holds
   * non-focusable content this test is the one that will catch it.
   */
  test('no scrollable region is keyboard-unreachable', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(WCAG22AA)
      .include('main')
      .analyze()

    const scrollIssues = results.violations.filter(
      (v) => v.id === 'scrollable-region-focusable',
    )
    expect(scrollIssues).toEqual([])
  })
})

test.describe('per-section states', () => {
  /**
   * The core claim of this screen: one rail failing does not take the page
   * with it. The mock fails "Unique Lodging" until its retries are exhausted
   * while every other section succeeds, so a page that renders an error AND
   * populated rails at the same time is the thing being proved.
   */
  test('one section can fail while the rest render', async ({ page }) => {
    await page.goto('/')

    const failing = page
      .locator('[data-slot="rail"]')
      .filter({ hasText: 'Unique Lodging' })
    await expect(failing.locator('[data-slot="error-state"]')).toBeVisible({
      timeout: 20_000,
    })

    // Other rails are populated at the same moment.
    const populated = page
      .locator('[data-slot="rail-scroller"]')
      .filter({ has: page.locator(CARD) })
    expect(await populated.count()).toBeGreaterThan(0)
  })

  /**
   * Cold start is a designed state, not a fallback. A brand-new user has no
   * collections, so "Ideas for Your Trip" is empty — and it says what to do
   * about that rather than just that nothing is there.
   */
  test('cold start renders an empty state for trips', async ({ page }) => {
    await page.goto('/')

    const trips = page
      .locator('[data-slot="rail"]')
      .filter({ hasText: 'Ideas for Your Trip' })
    await expect(trips.locator('[data-slot="empty-state"]')).toBeVisible()
    await expect(trips).toContainText('No trips yet')
  })

  /**
   * Budget is a HARD filter (user-flows.md §0). Narrowing it past everything
   * has to empty the rails rather than silently ignore the filter.
   */
  test('budget is a hard filter', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    await page.getByLabel(/maximum budget/i).fill('1')

    await expect(
      page.locator('[data-slot="empty-state"]').filter({
        hasText: 'Nothing in this range',
      }).first(),
    ).toBeVisible({ timeout: 20_000 })
  })
})

test.describe('the save toggle', () => {
  /**
   * Saving has no backend yet (an account is required, per user-flows.md §5),
   * so this only has to toggle — but it has to toggle ACCESSIBLY. A heart
   * that changes only its fill communicates nothing to a screen reader, so
   * the pressed state and the accessible name are what is asserted.
   */
  test('announces its pressed state', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    const save = page.getByRole('button', { name: /^Save / }).first()
    await expect(save).toHaveAttribute('aria-pressed', 'false')

    await save.click()

    const unsave = page.getByRole('button', { name: /^Remove .* from saved/ })
    await expect(unsave.first()).toHaveAttribute('aria-pressed', 'true')
  })
})
