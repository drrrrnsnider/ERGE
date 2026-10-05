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
   * The summary bar's two glyphs are drawn at 22px but tap at 44px — and the
   * WHOLE 44 has to be live, not just reported. The back arrow's button used
   * to measure 44px while sitting in a 30px box that clipped it, so a box
   * test passed and a thumb 20px off-centre hit nothing. Hit-testing at
   * that offset is the only check that sees the difference.
   */
  test('the summary bar glyphs answer a tap across their full 44px', async ({
    page,
  }) => {
    await page.goto('/search/results?near=me')
    for (const control of [
      page.getByRole('button', { name: 'Back to search' }),
      page.getByRole('link', { name: 'Ask the concierge' }),
    ]) {
      await expect(control).toBeVisible()
      const reached = await control.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const y = r.top + r.height / 2
        return [-20, 20].map((dx) => {
          const hit = document.elementFromPoint(r.left + r.width / 2 + dx, y)
          return hit !== null && el.contains(hit)
        })
      })
      expect(reached).toEqual([true, true])
    }
  })

  /**
   * The selected category is drawn in Action/Inverse, as the design binds
   * it. Today that is the same colour as Text/Primary, so comparing colours
   * cannot tell the two roles apart — a tab on `text-foreground` would pass
   * any such check and quietly stay behind the day the two diverge. So this
   * re-points the role and watches the tab follow: the label and its rule
   * must move, and an unselected tab must not.
   */
  test('the selected category follows Action/Inverse', async ({ page }) => {
    await page.goto('/search/results?category=drinks')
    const selected = page.getByRole('button', { name: 'Drinks', exact: true })
    await expect(selected).toHaveAttribute('aria-pressed', 'true')

    const result = await selected.evaluate(async (on) => {
      const off = document.querySelector<HTMLElement>(
        '[data-slot="tab-text"][aria-pressed="false"]',
      )!
      const root = document.documentElement
      root.style.setProperty('--action-inverse', 'red')
      await new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      )
      /* Compared in the page against the probe's own computed form, so no
       * colour literal appears here for the raw-colour lint to flag. */
      const probe = getComputedStyle(root).getPropertyValue('--action-inverse')
      const swatch = document.createElement('span')
      swatch.style.color = probe
      document.body.appendChild(swatch)
      const target = getComputedStyle(swatch).color
      swatch.remove()
      const seen = {
        label: getComputedStyle(on).color === target,
        rule: getComputedStyle(on.firstElementChild!).borderBottomColor === target,
        unselected: getComputedStyle(off).color === target,
      }
      root.style.removeProperty('--action-inverse')
      return seen
    })

    expect(result).toEqual({ label: true, rule: true, unselected: false })
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
   * The copper hairline — Border/Subtle Focus — on the two things that use
   * it here: a selected chip's edge and the search pill's ring. Both were
   * `border-subtle` until Figma gained an opaque Border/Subtle and that name
   * moved to it. A call site that missed the rename would not error; it
   * would quietly draw a near-black line instead, which on this UI looks
   * close enough to ship. So: warm, and translucent.
   */
  test('a selected chip and the search pill keep the copper hairline', async ({
    page,
  }) => {
    await page.goto('/search/results?near=me')
    const chip = page.getByRole('button', { name: 'Right Now' })
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')

    const colours = await page.evaluate(() => {
      const chipEl = [...document.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === 'Right Now',
      )!
      const pill = document.querySelector('[data-slot="input-field"]')!
      /* The ring is a gradient fed by --field-stroke, so resolve the
       * variable through a probe rather than reading a border colour. */
      const probe = document.createElement('div')
      probe.style.color = 'var(--field-stroke)'
      pill.appendChild(probe)
      const ring = getComputedStyle(probe).color
      probe.remove()
      return [getComputedStyle(chipEl).borderTopColor, ring]
    })

    for (const colour of colours) {
      const [r = 0, , b = 0, alpha = 1] = (colour.match(/[\d.]+/g) ?? []).map(Number)
      expect(r, colour).toBeGreaterThan(b)
      expect(alpha, colour).toBeLessThan(1)
    }
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
   * Under reduced motion the sheet JUMPS rather than slides. It used to
   * gate only the duration behind `motion-safe:`, so with reduced motion on
   * it fell back to the default duration and slid anyway, while its comment
   * said it jumped. Only the phone projects open a sheet — desktop gets a
   * popover, which fades, and a fade moves nothing.
   */
  test('a sheet does not slide under reduced motion', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Desktop opens a popover, not a sheet.')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()

    await page.getByRole('button', { name: /Duration/ }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    const moving = await sheet.evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(moving).not.toMatch(/transform|translate/)
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
   * The pinned header keeps its rounded top corners, and what scrolls under
   * it is cropped to them. The header was always rounded, but the cards
   * behind it showed through the gaps beside each curve, so the corners
   * read as notches rather than as the edge of a sheet. The scroller is now
   * rounded to the same radius and clips its content there.
   *
   * PIXELS, NOT HIT-TESTING. The first version of this asked
   * `elementFromPoint` what was in the corner, and WebKit failed it with
   * the fix in place: it draws the curve correctly — photographed — but
   * hit-tests as if the box were square. So this photographs a 2px square
   * just inside the top-left corner, outside the curve, then hides the
   * scroller and photographs it again. The two match only if the corner was
   * already showing what is behind the sheet. Left corner only: the right
   * one is where a scrollbar sits, and the clip is one rule for both.
   */
  test('the pinned header keeps its rounded corners and crops what passes under', async ({
    page,
  }) => {
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()

    const scroller = page
      .getByRole('group', { name: 'Category' })
      .locator('xpath=ancestor::div[contains(@class, "overflow-y-auto")][1]')
    const settle = () =>
      page.evaluate(
        () =>
          new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          ),
      )

    // Well past the pin, so cards are passing under the header.
    await scroller.evaluate((el) => {
      el.scrollTop = 900
    })
    await settle()

    const box = (await scroller.boundingBox())!
    const corner = { x: box.x + 1, y: box.y + 1, width: 2, height: 2 }
    const shown = await page.screenshot({ clip: corner })

    await scroller.evaluate((el) => {
      el.style.visibility = 'hidden'
    })
    await settle()
    const behind = await page.screenshot({ clip: corner })

    expect(shown.equals(behind)).toBe(true)
  })

  /**
   * Whatever is floating on a card — the save heart, the Elite badge —
   * passes BEHIND the pinned header, not over it. Both sit at z-10 inside the
   * card, the same as the header, and they used to win because the cards come
   * later in the page; the card's `isolate` keeps them inside it.
   *
   * Each one is scrolled to sit dead centre behind the header and then
   * hit-tested there. The pin test above could not catch this: it probes the
   * middle of "All", and nothing happened to be under that one point.
   */
  test('card badges and hearts pass behind the pinned filters', async ({
    page,
  }) => {
    await page.goto('/search/results')
    await expect(page.locator(cards).first()).toBeVisible()

    const onTop = await page
      .getByRole('group', { name: 'Category' })
      .evaluate(async (group, cardSelector) => {
        const header = group.parentElement!
        const scroller = header.closest<HTMLElement>('.overflow-y-auto')!
        const floating = [
          ...document.querySelectorAll<HTMLElement>(
            `${cardSelector} [data-slot="save-button"], ${cardSelector} [data-slot="badge"][data-variant="elite"]`,
          ),
        ]
        const settle = () =>
          new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          )

        /* Pin the header FIRST. At rest it rides along with the sheet, so
         * scrolling a heart up moves the header by the same amount and the
         * two never meet — the first draft of this test did exactly that and
         * failed with the fix in place. Scrolling the header to the top of
         * the scroller is what makes it stop moving. */
        scroller.scrollTop +=
          header.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top
        await settle()

        const kinds = new Set<string>()
        const escaped: string[] = []
        for (const el of floating) {
          const kind = el.dataset.variant === 'elite' ? 'elite-badge' : (el.dataset.slot ?? '')
          if (kinds.has(kind)) continue
          kinds.add(kind)

          /* Put its centre on the header's centre, then see who is on top. */
          const h = header.getBoundingClientRect()
          const r = el.getBoundingClientRect()
          scroller.scrollTop +=
            r.top + r.height / 2 - (h.top + h.height / 2)
          await settle()
          const now = el.getBoundingClientRect()
          const hit = document.elementFromPoint(
            now.x + now.width / 2,
            now.y + now.height / 2,
          )
          if (hit === null || !header.contains(hit)) escaped.push(kind)
        }
        return { checked: [...kinds], escaped }
      }, cards)

    // Both kinds have to be on the page, or this tested nothing.
    expect(onTop.checked.sort()).toEqual(['elite-badge', 'save-button'])
    expect(onTop.escaped).toEqual([])
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
