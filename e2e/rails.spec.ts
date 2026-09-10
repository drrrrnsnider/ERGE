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

test.describe('the overlay bars', () => {
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
   * The same guarantee at the top edge.
   *
   * The top bar is an overlay too now — it has to be, for content to fade
   * under it — so `scroll-pt` reserves its height the way `scroll-pb` does
   * below. Same construction as the test above: put the card under the bar
   * first, prove it is covered, then focus it and require it to have moved
   * clear. Merely being above the fold proves nothing.
   */
  test('a focused card is never left under the top bar', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    const link = page.locator(`${CARD} a`).first()

    await link.evaluate((el) => {
      const main = document.getElementById('main')!
      const barBottom = document
        .querySelector('header')!
        .getBoundingClientRect().bottom
      main.scrollTop += el.getBoundingClientRect().top - (barBottom - 20)
    })

    const covered = await link.boundingBox()
    const barBefore = await page.locator('header').boundingBox()
    expect(covered!.y).toBeLessThan(barBefore!.y + barBefore!.height)

    await link.focus()

    const card = await link.boundingBox()
    const bar = await page.locator('header').boundingBox()
    expect(card!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height - 1)
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

  /**
   * The top bar paints above the screen.
   *
   * It cannot rely on tree order the way the search row does: it has to come
   * BEFORE `main` in the DOM so the menu button precedes the page content in
   * the tab order, and `main` carries `isolate`, which makes it paint as
   * though it were a positioned z-index:0 element. Measured before the fix:
   * cards scrolled straight over the wordmark. Hence an explicit z-index,
   * which cannot be outbid from inside the screen precisely because `main`
   * is a stacking context.
   *
   * HOW THIS IS MEASURED, because it is not obvious. `elementFromPoint`
   * reports hit-testing, not painting. The two normally agree — hit-testing
   * walks paint order in reverse — but they came apart the moment the bar
   * became `pointer-events-none` to stop eating taps, and this test failed
   * while the bar was still visibly on top. So the probe re-enables pointer
   * events for the duration of the measurement and puts them back. That is an
   * instrument, not a fixture: with both sides hittable, whatever comes back
   * topmost is whatever is painted on top. The pointer behaviour itself is a
   * separate test below, so nothing here depends on the override being right.
   */
  test('the top bar paints above the scrolling content', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    const topmost = await page.evaluate(() => {
      const main = document.getElementById('main')!
      const header = document.querySelector('header')! as HTMLElement
      main.scrollTop = 300
      const b = header.getBoundingClientRect()
      const previous = header.style.pointerEvents
      header.style.pointerEvents = 'auto'
      try {
        // Sample across the bar: content overlaps different parts of it.
        return [0.1, 0.5, 0.85].map((fx) => {
          const el = document.elementFromPoint(
            Math.round(b.width * fx),
            Math.round(b.top + b.height / 2),
          )
          return header.contains(el)
        })
      } finally {
        header.style.pointerEvents = previous
      }
    })

    expect(topmost).toEqual([true, true, true])
  })

  /**
   * The top bar's blur and tint are exactly the bar's own size, and the blur
   * RAMPS rather than switching on at a hard edge.
   *
   * The sizing half is the regression risk. Both layers used to be siblings
   * of the header with a hardcoded height, which had to be kept in step with
   * the bar by hand; they are children with `inset-0` now, and this asserts
   * the outcome so the arrangement cannot quietly go back to two numbers that
   * drift apart. A bar that grows a row of chrome and leaves its fade behind
   * is the exact bug.
   *
   * The ramp half asserts a mask alongside the backdrop-filter, because
   * `backdrop-filter` takes ONE radius: without the mask the blur would stop
   * dead at the bar's edge, which is the thing the fade exists to avoid.
   */
  test('the top bar fade is the size of the bar and ramps out', async ({
    page,
  }) => {
    await page.goto('/')

    const measured = await page.evaluate(() => {
      const header = document.querySelector('header')!
      const layers = [...header.children].filter((c) =>
        c.hasAttribute('aria-hidden'),
      )
      const box = (el: Element) => {
        const b = el.getBoundingClientRect()
        return `${Math.round(b.width)}x${Math.round(b.height)}@${Math.round(b.top)}`
      }
      const blur = layers.find(
        (l) => getComputedStyle(l).backdropFilter !== 'none',
      )
      return {
        layerCount: layers.length,
        headerBox: box(header),
        layerBoxes: layers.map(box),
        backdrop: blur ? getComputedStyle(blur).backdropFilter : null,
        masked: blur ? getComputedStyle(blur).maskImage.includes('gradient') : false,
      }
    })

    expect(measured.layerCount).toBe(2)
    // Both layers are the bar, exactly — not a number kept in step by hand.
    expect(measured.layerBoxes).toEqual([
      measured.headerBox,
      measured.headerBox,
    ])
    expect(measured.backdrop).toContain('blur')
    expect(measured.masked).toBe(true)
  })

  /**
   * `main`'s top reservation IS the top bar's height.
   *
   * They are two hand-written numbers in different files — the bar's own
   * height comes from its padding and its button, `scroll-pt` is a literal on
   * `main` — and nothing but this connects them. Change one and content
   * either hides under the bar or floats below a gap, with no error. Asserted
   * against the measured bar rather than a pinned 3rem, so restyling the bar
   * is free and forgetting the reservation is not.
   */
  test('the scroll reservation matches the top bar it is reserving for', async ({
    page,
  }) => {
    await page.goto('/')

    const { barHeight, reserved, padded } = await page.evaluate(() => {
      const main = document.getElementById('main')!
      const cs = getComputedStyle(main)
      return {
        barHeight: document.querySelector('header')!.getBoundingClientRect()
          .height,
        reserved: parseFloat(cs.scrollPaddingTop),
        padded: parseFloat(cs.paddingTop),
      }
    })

    expect(reserved).toBeCloseTo(barHeight, 0)
    expect(padded).toBeCloseTo(barHeight, 0)
  })

  /**
   * The bars are mostly transparent, and must not eat taps where they are.
   *
   * Both float over the scroll area, so their padding and the space around
   * their controls sit on top of cards. Measured before the fix: a card under
   * the empty half of the top bar could not be tapped, and neither could one
   * under the search row's side padding. The bars carry
   * `pointer-events-none` and their controls opt back in.
   *
   * Both directions are asserted. Only checking that content is reachable
   * would pass just as well if the whole bar went inert and its own buttons
   * stopped working.
   */
  test('the bars pass taps through where they are empty, not where they are not', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()

    const hits = await page.evaluate(() => {
      const main = document.getElementById('main')!
      main.scrollTop = 300
      const header = document.querySelector('header')!
      const search = document.querySelector('search')!
      const menu = header.querySelector('a')!
      const field = search.querySelector('input')!
      const hb = header.getBoundingClientRect()
      const sb = search.getBoundingClientRect()
      const mb = menu.getBoundingClientRect()
      const fb = field.getBoundingClientRect()
      const at = (x: number, y: number) =>
        document.elementFromPoint(Math.round(x), Math.round(y))

      return {
        // Empty space beside the wordmark, and the search row's side padding.
        besideWordmark: header.contains(at(hb.width * 0.85, hb.height / 2)),
        searchPadding: search.contains(at(6, sb.top + sb.height / 2)),
        // ...and the controls themselves still take their own taps.
        onMenu: menu.contains(at(mb.left + mb.width / 2, mb.top + mb.height / 2)),
        onField: field.contains(at(fb.left + fb.width / 2, fb.top + fb.height / 2)),
      }
    })

    expect(hits.besideWordmark).toBe(false)
    expect(hits.searchPadding).toBe(false)
    expect(hits.onMenu).toBe(true)
    expect(hits.onField).toBe(true)
  })

  /** The scrim is decoration over 104px of scrollable content. If it ever
   * stops being click-through, everything beneath it silently stops working. */
  test('the fade does not swallow clicks', async ({ page }) => {
    await page.goto('/')
    const fade = page.locator('search').locator('xpath=preceding-sibling::div[1]')
    await expect(fade).toHaveCSS('pointer-events', 'none')
  })
})

test.describe('card strokes', () => {
  /**
   * Media is framed by a Border/Subtle Focus gradient — translucent copper at
   * the top edge, fading to nothing at the bottom.
   *
   * Worth a test because this has been wrong three ways. It was a
   * Border/Brighter gradient, which the flattened Figma code implies and the
   * variable list contradicts. Then it became a flat Border/Subtle Focus
   * border, which had the colour right and dropped the fade. In between, a
   * fix used `border-subtle`, which is not a class at all — the colour is
   * NAMED border-subtle, so with the `border-` prefix it is
   * `border-border-subtle` — and Tailwind dropped the unknown class silently,
   * leaving the opaque neutral, which on a dark UI looks close enough to ship.
   *
   * So this asserts the properties that separate the real thing from all
   * three: a gradient, warm and translucent at the top, fully transparent at
   * the bottom. Channel comparison rather than pinned values, so retokenising
   * cannot break it.
   */
  test('media is framed in a copper gradient that fades out', async ({
    page,
  }) => {
    await page.goto('/')
    const card = page.locator('[data-variant="media-sm"]').first()
    await expect(card).toBeVisible()

    const frame = await card.locator('> div').first().evaluate((el) => {
      // The stroke is a gradient, so it lives on ::after's background rather
      // than on any border-color — a gradient cannot BE a border colour.
      const bg = getComputedStyle(el, '::after').backgroundImage
      const stops = bg.match(/(?:rgba?|color)\([^)]*\)/g) ?? []
      const nums = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number)
      const first = nums(stops[0] ?? '')
      const last = nums(stops[stops.length - 1] ?? '')
      const alphaOf = (n: number[]) => (n.length > 3 ? n[3]! : 1)
      return {
        isGradient: bg.includes('gradient'),
        stops: stops.length,
        topAlpha: alphaOf(first),
        topIsWarm: (first[0] ?? 0) > (first[2] ?? 0),
        bottomAlpha: alphaOf(last),
      }
    })

    expect(frame.isGradient).toBe(true)
    expect(frame.stops).toBeGreaterThanOrEqual(2)
    // Full strength at the top edge...
    expect(frame.topAlpha).toBeGreaterThan(0)
    expect(frame.topAlpha).toBeLessThan(1)
    expect(frame.topIsWarm).toBe(true)
    // ...and gone by the bottom.
    expect(frame.bottomAlpha).toBe(0)
  })

  /**
   * Elite is the same stroke turned up, not a different object.
   *
   * Its gradient runs Border/Focus to Border/Subtle Focus — so unlike the
   * media stroke it does NOT reach transparent, it lands on the exact hairline
   * an ordinary card is framed in. That bottom stop is the whole point, and
   * it is the one thing a careless "make it copper" would get wrong, so it is
   * what this asserts hardest.
   *
   * The badge carries the identical gradient, and the two are compared to
   * each other rather than to pinned values: the frame and the pill inside it
   * have to stay one treatment.
   */
  test('an Elite card and its badge share a gradient that lands on the hairline', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByText('Elite', { exact: true }).first()).toBeVisible()

    const elite = await page.evaluate(() => {
      const badge = [...document.querySelectorAll('p')].find(
        (p) => p.textContent?.trim() === 'Elite',
      )!
      const frame = badge.closest('[data-slot="experience-card"]')!
        .firstElementChild!
      const read = (el: Element) => {
        const bg = getComputedStyle(el, '::after').backgroundImage
        const stops = bg.match(/(?:rgba?|color)\([^)]*\)/g) ?? []
        const nums = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number)
        const alpha = (n: number[]) => (n.length > 3 ? n[3]! : 1)
        const first = nums(stops[0] ?? '')
        const last = nums(stops[stops.length - 1] ?? '')
        return {
          bg,
          topAlpha: alpha(first),
          topWarm: (first[0] ?? 0) > (first[2] ?? 0),
          bottomAlpha: alpha(last),
          bottomWarm: (last[0] ?? 0) > (last[2] ?? 0),
        }
      }
      return { badge: read(badge), frame: read(frame) }
    })

    // Full strength at the top.
    expect(elite.frame.topAlpha).toBe(1)
    expect(elite.frame.topWarm).toBe(true)

    // And it eases to the house hairline, NOT to nothing. A media stroke ends
    // at alpha 0; this one must not.
    expect(elite.frame.bottomAlpha).toBeGreaterThan(0)
    expect(elite.frame.bottomAlpha).toBeLessThan(1)
    expect(elite.frame.bottomWarm).toBe(true)

    // Badge and frame are one treatment.
    expect(elite.badge.bg).toBe(elite.frame.bg)
  })
})
