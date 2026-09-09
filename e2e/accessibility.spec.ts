import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Automated accessibility scan of every screen, in a real browser.
 *
 * Two honest caveats, so nobody reads a green run as "this is accessible":
 *  - axe catches roughly a third to a half of WCAG issues. Keyboard order,
 *    focus management and sensible labelling still need a human.
 *  - the token-level contrast guarantees are checked separately, in
 *    src/tokens/tokens.test.ts, because those must hold for colour pairings
 *    that no page happens to render yet.
 */

const WCAG22AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Wait until every section has resolved to content, an empty state or an
 * error — nothing still loading.
 *
 * Explore loads per section, so scanning the moment the heading appears
 * catches a different subset of the page each run: sometimes the promo card
 * is there, sometimes it is not. That made a REAL violation
 * (a colour-only link, `link-in-text-block`) show up in maybe one run in
 * three, which is the worst possible way for an accessibility test to
 * behave — people learn to re-run it. Settling first makes the scan
 * deterministic and covers the error state as well.
 *
 * The timeout is generous because one section deliberately fails, and only
 * after its retries are exhausted.
 */
async function settleSections(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, {
    timeout: 25_000,
  })
}

test.describe('accessibility', () => {
  test('home screen has no detectable WCAG 2.2 AA violations', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ERGE' })).toBeVisible()
    await settleSections(page)

    const results = await new AxeBuilder({ page })
      .withTags(WCAG22AA)
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('home screen passes in dark mode too', async ({ page }) => {
    await page.goto('/')
    await settleSections(page)
    await page.evaluate(async () => {
      document.documentElement.classList.add('dark')

      /* Buttons carry `transition-all`, so flipping the theme starts a colour
       * animation. Scanning straight away samples a half-blended frame — a
       * mid-transition mix of the light and dark values that belongs to
       * neither theme — and axe reports contrast failures for colours the app
       * never actually rests on. Wait for the transitions to finish so we
       * assert against the settled dark theme, which is the thing we mean.
       *
       * TRANSITIONS ONLY. Skeleton placeholders pulse on an infinite loop,
       * and an infinite animation's `finished` promise never resolves — so
       * awaiting every animation on the page hangs here forever whenever a
       * section happens to still be loading. */
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation instanceof CSSTransition)
          .map((animation) => animation.finished),
      )
    })

    const results = await new AxeBuilder({ page })
      .withTags(WCAG22AA)
      .analyze()

    expect(results.violations).toEqual([])
  })

  /**
   * The app is dark-only, and `<html class="dark">` is what makes that true.
   * src/styles/theme.css binds Tailwind's `dark:` variant to that class, and
   * the vendored base-nova components carry nine `dark:` utilities of their
   * own. Drop the class and those stop matching — every surface, border and
   * the outline button silently revert to light-mode styling on top of our
   * dark tokens, with no light theme to fall back to.
   *
   * That failure is invisible to axe (it is a design regression, not a
   * violation), so it gets its own assertion.
   */
  test('the dark class is present on <html>', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  })

  /**
   * Every interactive target on the page, with its rendered size and whether
   * it has opted out of the coarse-pointer floor.
   *
   * `sr-only` elements are excluded: the skip link measures 1x1 while hidden
   * and only becomes a target once focused, which its own test covers.
   */
  async function measureTargets(page: Page) {
    return page.evaluate(() => {
      const selector =
        'a, button, input, select, textarea, [role="button"], [role="link"]'

      /* The same selector theme.css raises to 44px under `pointer: coarse`,
       * repeated here so the assertion cannot drift from the rule it checks.
       * Links are deliberately absent from BOTH: an inline link in a sentence
       * is exempt from 2.5.8, and forcing 44px on one would wreck the line
       * box. A link that is genuinely a target carries role="button" or
       * data-slot="button" and is caught by those. */
      const CONTROL =
        '[data-slot="button"], button, select, textarea,' +
        ' input:not([type="hidden"]), [role="button"]'

      return [...document.querySelectorAll(selector)]
        .filter((el) => !el.classList.contains('sr-only'))
        .map((el) => {
          const { width, height } = el.getBoundingClientRect()
          return {
            label: (el.textContent ?? '').trim().slice(0, 30),
            tag: el.tagName.toLowerCase(),
            width: Math.round(width),
            height: Math.round(height),
            compact: el.getAttribute('data-target') === 'compact',
            control: el.matches(CONTROL),
            /* SC 2.5.8's "Inline" exception, verbatim: the target is "in a
             * sentence or its size is otherwise constrained by the
             * line-height of non-target text". Detected structurally rather
             * than by listing known links — an <a> whose parent holds text
             * besides the link's own IS in a sentence. A heading that is
             * nothing but a link fails this check and stays asserted, which
             * is right: that one is a block target, not an inline one. */
            inlineInText:
              el.matches('a:not([role="button"]):not([data-slot="button"])') &&
              (el.parentElement?.textContent ?? '').trim() !==
                (el.textContent ?? '').trim(),
          }
        })
    })
  }

  /**
   * Wait for the rails to render before measuring.
   *
   * This is not tidiness. Without it these three tests measured `page.goto`'s
   * first paint — the top bar, the search field and the tabs — and nothing
   * inside a card, because the sections are fetched. A 20x20 save button on
   * `Card / Media SM` lived in the app through several green runs for exactly
   * that reason: the assertion was real, the sample was empty.
   */
  async function settled(page: Page) {
    await expect(
      page.locator('[data-slot="experience-card"]').first(),
    ).toBeVisible()
  }

  const tooSmall = (min: number) =>
    ({ width, height }: { width: number; height: number }) =>
      width < min || height < min

  /**
   * WCAG 2.2 2.5.8 Target Size (Minimum) — the legal floor, 24x24, everywhere.
   * This holds on desktop and mobile, opted out or not.
   */
  test('every interactive target meets the 24px minimum', async ({ page }) => {
    await page.goto('/')
    await settled(page)
    const targets = (await measureTargets(page)).filter((t) => !t.inlineInText)
    expect(targets.filter(tooSmall(24))).toEqual([])
  })

  /**
   * On a phone a thumb needs 44x44, so theme.css raises controls to that under
   * `pointer: coarse`. This asserts it actually happened.
   *
   * Mobile projects only — not a tolerated failure elsewhere, but a rule that
   * deliberately does not apply on desktop, where the same controls are meant
   * to stay dense and `pointer: coarse` does not match.
   */
  test('non-compact targets meet 44px on coarse pointers', async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.startsWith('mobile'),
      'coarse-pointer sizing deliberately does not apply on desktop',
    )
    await page.goto('/')
    await settled(page)
    const targets = await measureTargets(page)
    expect(
      targets.filter((t) => t.control && !t.compact).filter(tooSmall(44)),
    ).toEqual([])
  })

  /**
   * The escape hatch keeps a floor of its own. `data-target="compact"` costs
   * 12px — it does not drop a control to the 24px legal minimum. Anything
   * smaller than 32px is a misuse of the attribute, not a smaller chip.
   *
   * Vacuous on a screen with no compact controls, which is the correct
   * behaviour: the invariant is conditional on opting out.
   */
  test('compact targets still meet 32px on coarse pointers', async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.startsWith('mobile'),
      'coarse-pointer sizing deliberately does not apply on desktop',
    )
    await page.goto('/')
    await settled(page)
    const targets = await measureTargets(page)
    expect(targets.filter((t) => t.compact).filter(tooSmall(32))).toEqual([])
  })

  /**
   * A focused text field has to LOOK focused (SC 2.4.7).
   *
   * This is the test that was missing while these fields had no focus
   * indicator at all — measured as `outline-style: none` on a focused field,
   * which axe cannot catch, because a missing indicator is not detectable
   * from the accessibility tree.
   *
   * The border change is the always-on part, and it has to actually happen.
   * Colours are compared before against after rather than pinned to a value,
   * so retokenising cannot break the test. Both fields are covered, because
   * they get there differently: the budget field has a 0.5px top hairline and
   * the search field a full 1px border.
   *
   * The ring is the keyboard-only part, asserted separately below. Both
   * halves matter: a ring that never appears fails the keyboard user, and one
   * that appears on click is the thing we deliberately removed.
   */
  test('a focused text field is visibly focused', async ({ page }) => {
    await page.goto('/')

    const read = (pill: Locator) =>
      pill.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { outline: cs.outlineStyle, border: cs.borderTopColor }
      })

    const cases = [
      {
        pill: page.locator('[data-slot="input-field"]').first(),
        control: page.getByRole('spinbutton', { name: /^min/i }),
      },
      {
        pill: page.locator('[data-slot="input-field"]').last(),
        control: page.getByRole('searchbox'),
      },
    ]

    for (const { pill, control } of cases) {
      await expect(pill).toBeVisible()
      const blurred = await read(pill)
      await control.click()
      const focused = await read(pill)

      expect(focused.border).not.toBe(blurred.border)
      // Clicked, so no ring — that is the pointer case.
      expect(blurred.outline).toBe('none')
      expect(focused.outline).toBe('none')
    }
  })

  /**
   * ...and the ring IS there for someone tabbing between fields.
   *
   * The two budget fields are adjacent in the tab order, so this clicks the
   * first — establishing pointer modality and NO ring, which is half the
   * assertion — and then presses Tab once to arrive at the second by
   * keyboard. Same page, same controls, one keystroke apart: the only thing
   * that differs is how focus got there.
   */
  test('the focus ring is for keyboard navigation, not for clicks', async ({
    page,
  }) => {
    await page.goto('/')

    const minPill = page.locator('[data-slot="input-field"]').first()
    const maxPill = page.locator('[data-slot="input-field"]').nth(1)
    await expect(minPill).toBeVisible()

    await page.getByRole('spinbutton', { name: /^min/i }).click()
    await expect(minPill).toHaveCSS('outline-style', 'none')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('spinbutton', { name: /^max/i })).toBeFocused()
    await expect(maxPill).not.toHaveCSS('outline-style', 'none')
  })

  /**
   * The skip link, asserted differently per engine — deliberately, and not as
   * a workaround for a bug in our markup.
   *
   * WebKit leaves links out of the Tab sequence unless macOS's "Use keyboard
   * navigation to move focus between controls" is switched on, and it is off
   * by default. That is Safari deferring to a system setting. The link itself
   * is a plain `<a href>` with no tabindex games, and Chromium tabs to it
   * exactly as it should, so there is nothing here to fix.
   *
   * Chromium therefore asserts what a keyboard user actually does — press Tab
   * once — and WebKit asserts everything about the link that does not depend
   * on the Tab sequence: focusing it reveals it, it paints above the content
   * it covers, and activating it moves focus to #main.
   *
   * DO NOT collapse these into one branch.
   *   - Deleting the Chromium branch loses the only check that the link is
   *     FIRST in the tab order, which is the entire point of a skip link.
   *   - Deleting the WebKit branch stops testing WebKit at all.
   * Neither is skipped: every project runs a hard assertion.
   */
  test('the skip link is reachable and moves focus past the chrome', async ({
    page,
    browserName,
  }) => {
    await page.goto('/')
    const skipLink = page.getByRole('link', { name: 'Skip to main content' })

    if (browserName === 'chromium') {
      await page.keyboard.press('Tab')
      await expect(skipLink).toBeFocused()
    } else {
      await skipLink.focus()
      await expect(skipLink).toBeFocused()

      // It must stop being visually hidden. `sr-only` clips it to 1x1; the
      // `focus:not-sr-only` variant is what undoes that.
      await expect(skipLink).toBeVisible()
      const revealed = await skipLink.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        const topmost = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        )
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          clip: getComputedStyle(el).clip,
          // Whatever it overlaps, it has to be the thing you actually hit.
          onTop: el === topmost || el.contains(topmost),
        }
      })
      expect(revealed.width).toBeGreaterThan(1)
      expect(revealed.height).toBeGreaterThan(1)
      expect(revealed.clip).toBe('auto')
      expect(revealed.onTop).toBe(true)
    }

    // Both engines. Without tabIndex={-1} on <main> this silently does
    // nothing: the hash changes, the page scrolls, and focus stays on <body>,
    // so the next Tab restarts from the top of the chrome.
    await skipLink.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
  })
})
