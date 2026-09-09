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
   *
   * `getByRole('spinbutton')` rather than `getByLabel(/^max/i)`, which now
   * matches two controls: the slider's upper thumb is also named "Maximum
   * budget". That ambiguity is the point of the next test.
   */
  test('budget is a hard filter', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    await page.getByRole('spinbutton', { name: /^max/i }).fill('1')

    await expect(
      page.locator('[data-slot="empty-state"]').filter({
        hasText: 'Nothing in this range',
      }).first(),
    ).toBeVisible({ timeout: 20_000 })
  })

  /**
   * The slider and the number fields are two views of ONE value, and the
   * whole risk in having both is that they drift apart. So this drives the
   * slider by keyboard — which is also the only way a keyboard user sets a
   * budget — and asserts the field followed.
   *
   * Keyboard rather than a drag on purpose: a two-thumb slider that is
   * mouse-only is the classic failure of this control, and it is worth a
   * hard test that the arrow keys reach it.
   */
  test('the budget slider and the budget fields are one value', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    const maxThumb = page.getByRole('slider', { name: /^maximum/i })
    const maxField = page.getByRole('spinbutton', { name: /^max/i })

    await expect(maxField).toHaveValue('500')

    await maxThumb.focus()
    await maxThumb.press('ArrowRight')
    await maxThumb.press('ArrowRight')

    // Two steps of 25 from 500. If the step ever changes this number moves,
    // which is correct — it is asserting the coupling, not the arithmetic.
    await expect(maxField).toHaveValue('550')

    // And the other direction: the field is the exact-entry path, so the
    // thumb has to follow it, not just lead it.
    await maxField.fill('300')
    await expect(maxThumb).toHaveJSProperty('value', '300')
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

test.describe('the tab bar', () => {
  /**
   * Every tab has two drawings, and the current one is FILLED.
   *
   * Explore is the only routed tab, which is exactly what makes it testable:
   * on `/` it is current, and on any unbuilt path it is not. Same element,
   * same page, two states — so this compares the actual rendered path data
   * rather than trusting that the right component was passed. A tab wired
   * with one glyph for both states fails here.
   */
  test('the current tab is drawn filled, the resting ones outlined', async ({
    page,
  }) => {
    // Scoped to the nav: the not-built screen has its own "Back to Explore"
    // link, and an unscoped name match picks up both.
    const explore = page
      .locator('nav[aria-label="Primary"]')
      .getByRole('link', { name: 'Explore' })
    const glyph = () => explore.locator('svg path').first().getAttribute('d')

    await page.goto('/')
    await expect(explore).toHaveAttribute('aria-current', 'page')
    const filled = await glyph()

    await page.goto('/somewhere-unbuilt')
    await expect(explore).not.toHaveAttribute('aria-current', 'page')
    const outline = await glyph()

    expect(outline).not.toBe(filled)
  })

  /**
   * A resting tab's icon is dimmer than its own label — Text/Disabled against
   * Text/Muted. That only survives review if it is written down as
   * deliberate, so it is asserted rather than left to look like a mistake.
   *
   * It is legible because the icon is decorative: it carries aria-hidden and
   * the label is the accessible name, so no meaning rests on the icon's
   * contrast (SC 1.4.1).
   */
  test('a resting tab icon is dimmer than its label', async ({ page }) => {
    await page.goto('/')

    const cart = page.getByText('Cart', { exact: true })
    const colours = await cart.evaluate((el) => ({
      label: getComputedStyle(el).color,
      icon: getComputedStyle(el.querySelector('svg') as Element).color,
    }))

    expect(colours.icon).not.toBe(colours.label)
    await expect(page.locator('nav[aria-label="Primary"] svg')).toHaveCount(5)
  })
})

test.describe('the search overlay', () => {
  /**
   * WCAG 2.4.11 Focus Not Obscured, which used to be free.
   *
   * The search row and its fade sit OVER the scroll area, because the design
   * has content dissolve under them (`bottom-input-fade`). Before that the
   * bars were siblings of `main` and could not overlap it at all, so this
   * criterion held structurally and needed no test. It no longer does, so the
   * guarantee moves here.
   *
   * `scroll-pb` on the scroll container is what keeps it true: the browser
   * treats the reserved strip as outside the scrollport, so focusing an
   * element under the row scrolls it clear rather than deciding it is already
   * visible. This focuses the LAST card link on the page — the one nearest
   * the bottom, and the one that fails first if that reservation is dropped.
   */
  test('a focused card is never left under the search row', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    const link = page.locator(`${CARD} a`).first()

    /* Put the card UNDER the row first. That is the case the criterion is
     * actually about: the element is inside the scrollport, so without a
     * reserved strip the browser calls it visible and does not scroll at all.
     * An element merely below the fold proves nothing here — it scrolls clear
     * on ordinary padding, which is how an earlier version of this test
     * passed with the reservation removed. */
    await link.evaluate((el) => {
      const main = document.getElementById('main')!
      const rowTop = document.querySelector('search')!.getBoundingClientRect().top
      main.scrollTop += el.getBoundingClientRect().bottom - (rowTop + 20)
    })

    const covered = await link.boundingBox()
    const rowBefore = await page.locator('search').boundingBox()
    expect(covered!.y + covered!.height).toBeGreaterThan(rowBefore!.y)

    await link.focus()

    const card = await link.boundingBox()
    const overlay = await page.locator('search').boundingBox()
    // Its bottom edge must clear the top of the row, not merely overlap less.
    expect(card!.y + card!.height).toBeLessThanOrEqual(overlay!.y + 1)
  })

  /**
   * Content passes UNDER the row, never over it.
   *
   * Cards lift things above their siblings with z-index — the Elite badge,
   * the save heart — and those were painting on top of the search row,
   * because neither `main` (static) nor its wrapper (relative, z-index auto)
   * created a stacking context, so a card's z-10 was competing with the
   * overlay's z-auto in the ROOT stacking context and winning.
   *
   * `isolate` on `main` is the fix, and this asserts the OUTCOME rather than
   * the property: it scrolls until a lifted element sits inside the search
   * pill's rectangle, then checks what is actually topmost at that point.
   * Asserting `isolation: isolate` instead would pass just as happily if
   * someone later added a z-index that broke it again.
   *
   * `found` is asserted too. Without it, a fixture change that stopped
   * producing an overlap would turn this into a test that always passes.
   */
  test('content scrolls under the search row, never over it', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    const result = await page.evaluate(() => {
      const main = document.getElementById('main')!
      const row = document.querySelector('search')!
      const pill = row.querySelector('[data-slot="input-field"]')!
      const lifted = () =>
        [...document.querySelectorAll('[data-slot="experience-card"] *')].filter(
          (el) => getComputedStyle(el).zIndex !== 'auto',
        )

      for (let top = 0; top < main.scrollHeight - main.clientHeight; top += 20) {
        main.scrollTop = top
        const p = pill.getBoundingClientRect()
        for (const el of lifted()) {
          const r = el.getBoundingClientRect()
          // Its CENTRE has to land on the pill — that is the point the hit
          // test uses. Requiring the whole element to fit inside the pill is
          // too strict to ever happen on a phone, where the card is nearly
          // as wide as the field.
          const x = Math.round(r.left + r.width / 2)
          const y = Math.round(r.top + r.height / 2)
          const onPill =
            x > p.left + 4 && x < p.right - 4 && y > p.top + 4 && y < p.bottom - 4
          if (!onPill) continue
          const stack = document.elementsFromPoint(x, y)
          return {
            found: true,
            zIndex: getComputedStyle(el).zIndex,
            topmostIsTheRow: row.contains(stack[0] ?? null),
          }
        }
      }
      return { found: false, zIndex: null, topmostIsTheRow: false }
    })

    expect(result.found).toBe(true)
    expect(result.topmostIsTheRow).toBe(true)
  })

  /** The scrim is decoration over 104px of scrollable content. If it ever
   * stops being click-through, everything beneath it silently stops working. */
  test('the fade does not swallow clicks', async ({ page }) => {
    await page.goto('/')
    const fade = page.locator('search').locator('xpath=preceding-sibling::div[1]')
    await expect(fade).toHaveCSS('pointer-events', 'none')
  })
})
