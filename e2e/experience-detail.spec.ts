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
   * SAVING IS ONE ANSWER, AND IT LASTS. Each screen used to keep its own
   * `saved`, so a heart lit on Explore was dark on the detail screen and
   * gone after navigating. Saving here and reading it on a different screen,
   * after a full reload, is the case that used to fail.
   */
  test('a save on Explore shows on the detail screen and survives a reload', async ({
    page,
  }) => {
    await page.goto('/')
    const save = page.getByRole('button', { name: 'Save Rooftop Picnic Night' }).first()
    await save.click()
    await expect(
      page.getByRole('button', { name: 'Remove Rooftop Picnic Night from saved' }).first(),
    ).toHaveAttribute('aria-pressed', 'true')

    /* In-app, by the card, as a person would — a hard `goto` here would
     * abandon the request still in flight, which no tap can do. */
    await page.getByRole('link', { name: 'Rooftop Picnic Night' }).first().click()
    await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible()

    /* The heart lights before the save lands — that is the optimistic
     * update — so reloading straight away could outrun the write. Wait for
     * it to reach the device, which is what a reload actually reads. */
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('erge.mock.saved.v1')))
      .toContain('exp-rooftop-picnic')
    await page.reload()
    // And unsaving is the same one answer, read back on Explore.
    await page.getByRole('button', { name: 'Saved', exact: true }).click()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(
      page.getByRole('button', { name: 'Save Rooftop Picnic Night' }).first(),
    ).toHaveAttribute('aria-pressed', 'false')
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

  /**
   * The thumbnail strip (Figma 230:9329): four photos as columns in ONE
   * rounded band, and, when the gallery holds more than the screen shows,
   * the last one dimmed under "See all N photos". The picnic has fourteen.
   *
   * The count link goes to the gallery's own address. It used to be a
   * button with no handler — present, pressable, and doing nothing.
   */
  test('the strip is one band, and offers the rest of the photos', async ({
    page,
  }) => {
    await page.goto(PICNIC)
    const seeAll = page.getByRole('link', { name: 'See all 14 photos' })
    await expect(seeAll).toBeVisible()
    await expect(seeAll).toHaveAttribute('href', '/experience/exp-rooftop-picnic/photos')

    const band = page.locator('[data-slot="photo-strip"]')
    await expect(band.locator(seeAll)).toBeVisible()
    await expect(band.locator('> li')).toHaveCount(4)
    // One frame: the band is rounded and clips, and its columns are not.
    const shape = await band.evaluate((ul) => ({
      bandRadius: getComputedStyle(ul).borderTopLeftRadius,
      clips: getComputedStyle(ul).overflow,
      columnRadius: getComputedStyle(ul.firstElementChild!).borderTopLeftRadius,
    }))
    expect(shape).toEqual({ bandRadius: '24px', clips: 'hidden', columnRadius: '0px' })
  })

  /**
   * The sail has four photos: a hero and three on the strip, so nothing is
   * hidden and there is nothing to offer. The strip is checked FIRST — an
   * earlier draft used the tasting menu, which has no photos and so no
   * strip, and passed with the overlay forced on.
   */
  test('offers no "See all" when every photo is already on screen', async ({
    page,
  }) => {
    await page.goto('/experience/exp-sunset-sail')
    await expect(page.locator('[data-slot="photo-strip"] > li')).toHaveCount(3)
    await expect(page.getByRole('link', { name: /See all/ })).toHaveCount(0)
  })

  /**
   * The nav bar is sticky (Figma 2343:3913). It stays at the top however far
   * you scroll, and once the page's title scrolls up under it, it takes the
   * title over: a solid background and the title in one line fade in. Back
   * up past that point, they fade out again.
   *
   * Driven by scrolling to exact offsets either side of the bar's bottom
   * edge, measured in the page, rather than a fixed number of pixels — the
   * hero, the strip and the inset all move the title.
   */
  test('the nav bar stays put and takes over the title', async ({ page }) => {
    await page.goto(PICNIC)
    const h1 = page.getByRole('heading', { level: 1, name: 'Rooftop Picnic Night' })
    await expect(h1).toBeVisible()
    const bar = page.locator('header[data-condensed]')
    await expect(bar).toHaveAttribute('data-condensed', 'false')

    /** Scroll so the title's top sits `gap` px below the bar's bottom. */
    const placeTitle = (gap: number) =>
      page.evaluate((gap) => {
        const main = document.querySelector('main')!
        const title = document.querySelector('h1')!
        const barBottom = document
          .querySelector('header[data-condensed]')!
          .getBoundingClientRect().bottom
        main.scrollTop += title.getBoundingClientRect().top - barBottom - gap
      }, gap)

    await placeTitle(10)
    await expect(bar).toHaveAttribute('data-condensed', 'false')

    await placeTitle(-10)
    await expect(bar).toHaveAttribute('data-condensed', 'true')
    // Still pinned to the top, not scrolled away with the photo.
    expect((await bar.boundingBox())?.y).toBe(0)
    // The bar's copy of the title is a drawing, not a second heading.
    const copy = bar.getByText('Rooftop Picnic Night')
    await expect(copy).toBeVisible()
    await expect(copy).toHaveAttribute('aria-hidden', 'true')

    await placeTitle(10)
    await expect(bar).toHaveAttribute('data-condensed', 'false')
  })

  /**
   * WCAG 2.4.11 against the pinned bar. Tabbing backwards up the page, the
   * browser scrolls each control just into view; without a scroll margin
   * that means the top edge of the screen, underneath a bar that is solid
   * by then. The `bleed` chrome's scroll padding reserves the bar's height.
   *
   * A first fix put `scroll-margin-top` on every control instead, and this
   * test failed it: Reserve, its overflow and the first flow button still
   * landed under the bar, because the browser judged them already in view.
   *
   * ONE PIXEL OF TOLERANCE, for rounding. The mobile-chrome device has a
   * pixel ratio of 2.75, scroll positions snap to device pixels, and a
   * control aligned to the bar's 64px edge measured 63.5 — half a pixel into
   * the bar's own bottom padding, covering nothing. Without the padding the
   * failures are whole controls, tens of pixels deep.
   */
  test('a control focused while tabbing backwards is not hidden under the bar', async ({
    page,
  }) => {
    await page.goto(PICNIC)
    // Wait for the pairings too: they add the last controls on the page.
    await expect(page.getByRole('link', { name: /^Build this evening/ })).toBeVisible()

    const hidden = await page.evaluate(async () => {
      const main = document.querySelector('main')!
      const bar = document.querySelector('header[data-condensed]')!
      main.scrollTop = main.scrollHeight
      const controls = [
        ...main.querySelectorAll<HTMLElement>('a[href], button'),
      ].filter((el) => !bar.contains(el))
      const under: string[] = []
      for (const el of controls.reverse()) {
        el.focus()
        await new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        )
        const r = el.getBoundingClientRect()
        if (r.top < bar.getBoundingClientRect().bottom - 1) {
          under.push(el.getAttribute('aria-label') ?? el.textContent ?? '')
        }
      }
      return under
    })
    expect(hidden).toEqual([])
  })

  /**
   * The price is set in Ovo (Display/Medium). `text-display-md` sets only
   * the size, so it needs `font-serif` beside it — and the price shipped
   * without, rendering in Outfit until a font audit caught it. Ovo was not
   * even downloaded on this page.
   *
   * Two checks, because either alone can pass falsely: the family names Ovo,
   * AND the face actually loaded, so a stylesheet asking for Ovo while the
   * browser quietly falls back to a system serif fails too.
   */
  test('the price is set in Ovo', async ({ page }) => {
    await page.goto(PICNIC)
    const price = page.getByText('$45', { exact: true })
    await expect(price).toBeVisible()

    const font = await price.evaluate(async (el) => {
      await document.fonts.ready
      return {
        family: getComputedStyle(el).fontFamily.split(',')[0]?.trim().replace(/['"]/g, ''),
        loaded: [...document.fonts].some((f) => f.family.replace(/['"]/g, '') === 'Ovo' && f.status === 'loaded'),
      }
    })
    expect(font).toEqual({ family: 'Ovo', loaded: true })
  })

  /**
   * The category badge beside the price (`Badge Icon`): the results row's
   * word and glyph for what the experience is. Only categories with a glyph
   * in the design get one; the jazz club is an `event`, which has none, so
   * it has no badge rather than an invented icon.
   */
  test('shows the category beside the price, when it has a glyph', async ({
    page,
  }) => {
    await page.goto(PICNIC)
    const badge = page.locator('[data-slot="badge"][data-variant="icon"]')
    await expect(badge).toHaveText('Dining')
    // In the price row, not floating somewhere else on the screen.
    await expect(badge.locator('..')).toContainText('$45')

    await page.goto('/experience/exp-jazz-club')
    await expect(page.getByRole('heading', { level: 1, name: 'Late Set at the Blue Door' })).toBeVisible()
    await expect(page.getByText('$32', { exact: true })).toBeVisible()
    await expect(badge).toHaveCount(0)
  })

  /**
   * The flow button's edge (`flow-ring` in theme.css): a Border/Subtle
   * Focus ring with a sliver of Action/Secondary light running round it,
   * and a copper glow. The light moves only because its two custom
   * properties are registered with @property — unregistered, they are
   * strings, and the light would jump instead of travelling. A jumping
   * light still CHANGES position, so "it moved" proves nothing; this waits
   * for a position BETWEEN the keyframes' 10% and 100%, which only
   * interpolation can produce.
   *
   * Under a pointer, the ring and the glow brighten. Only where the device
   * HAS a pointer: the mobile projects emulate touch, where (hover: hover)
   * is false and nothing may stick on after a tap — so there, the same
   * hover must change nothing.
   */
  test('the flow button orbits a light, and brightens under a pointer', async ({
    page,
  }) => {
    await page.goto(PICNIC)
    const flow = page.locator('[data-slot="button-flow"]').first()
    await expect(flow).toBeVisible()

    const read = () =>
      flow.evaluate((el) => {
        const s = getComputedStyle(el)
        return {
          x: s.getPropertyValue('--flow-x'),
          ring: s.getPropertyValue('--flow-ring'),
          shadow: s.boxShadow,
        }
      })

    const first = await read()
    /* The light rests for the first 6s of every 9s cycle, and runs in the
     * last 3 — so up to 9s before it moves at all. */
    await expect
      .poll(
        async () => {
          const x = parseFloat((await read()).x)
          return x > 10 && x < 100
        },
        { timeout: 12_000 },
      )
      .toBe(true)

    const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches)
    await flow.hover()
    if (canHover) {
      await expect.poll(async () => (await read()).ring).not.toBe(first.ring)
      expect((await read()).shadow).not.toBe(first.shadow)
    } else {
      await page.waitForTimeout(300)
      expect((await read()).ring).toBe(first.ring)
    }
  })

  /**
   * Between runs the light is OFF, not parked — and the REST COMES FIRST,
   * so nothing moves as the page loads (Darrin, 2026-10-06). Each 9s cycle
   * is a 6s pause and then a 3s circuit, and --flow-shine — the light's
   * colour — is transparent for the whole pause. An earlier version left it
   * lit at the lower right, which read as the loop overshooting and
   * stopping; a later one ran first, so every arrival began with motion.
   *
   * The animation is paused and moved to exact moments rather than waited
   * for: dark at the very start and through the pause, lit mid-run.
   */
  test('the flow light waits, then runs, and is off between runs', async ({ page }) => {
    await page.goto(PICNIC)
    const flow = page.locator('[data-slot="button-flow"]').first()
    await expect(flow).toBeVisible()

    const alphaAt = (ms: number) =>
      flow.evaluate((el, ms) => {
        const orbit = el
          .getAnimations()
          .find((a) => (a as CSSAnimation).animationName === 'flow-orbit')!
        orbit.pause()
        orbit.currentTime = ms
        const shine = getComputedStyle(el).getPropertyValue('--flow-shine')
        const probe = document.createElement('span')
        probe.style.color = shine
        document.body.appendChild(probe)
        const rgba = getComputedStyle(probe).color
        probe.remove()
        const parts = rgba.match(/[\d.]+/g)?.map(Number) ?? []
        return parts.length > 3 ? parts[3]! : 1
      }, ms)

    expect(await alphaAt(0)).toBe(0) // page load: still, and dark
    expect(await alphaAt(3000)).toBe(0)
    expect(await alphaAt(5900)).toBe(0)
    expect(await alphaAt(7500)).toBe(1) // mid-run
  })

  /**
   * For anyone who has asked their device for less motion, the light holds
   * still — at the lower right, where the design's own glint sits.
   */
  test('the flow button holds its light still under reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(PICNIC)
    const flow = page.locator('[data-slot="button-flow"]').first()
    await expect(flow).toBeVisible()

    const still = await flow.evaluate(async (el) => {
      const x = () => getComputedStyle(el).getPropertyValue('--flow-x')
      const before = x()
      await new Promise((done) => setTimeout(done, 400))
      return { animation: getComputedStyle(el).animationName, before, after: x() }
    })
    expect(still).toEqual({ animation: 'none', before: '90%', after: '90%' })
  })

  /**
   * Line height: Figma's "Auto" (CSS `normal`) for titles and single lines,
   * 1.5 for running paragraphs — Darrin's rule. Read as rendered boxes,
   * because "normal" only means something once the font's metrics turn it
   * into pixels: a one-line 21px Outfit title is 26 tall, as the frame draws
   * it; the 16px description runs at 24.
   *
   * The ELEMENT's box, not the text's. A first draft measured the text's
   * own glyph box, which the font sets regardless of line height — and
   * which happens to equal Auto exactly — so it passed with the scale
   * reverted to 1.5. A one-line element is one line-height tall; that is
   * what moves.
   */
  test('titles sit at Auto, paragraphs at 1.5', async ({ page }) => {
    await page.goto(PICNIC)
    const title = page.getByRole('heading', { level: 1, name: 'Rooftop Picnic Night' })
    await expect(title).toBeVisible()

    const boxes = await title.evaluate((h1) => {
      const description = h1.parentElement!.querySelector('p.text-body-lg')!
      const oneLine = (el: Element) => Math.round(el.getBoundingClientRect().height)
      return {
        titleLine: oneLine(h1),
        metaLine: oneLine(h1.nextElementSibling!),
        paragraphLineHeight: getComputedStyle(description).lineHeight,
      }
    })
    expect(boxes).toEqual({ titleLine: 26, metaLine: 18, paragraphLineHeight: '24px' })
  })
})
