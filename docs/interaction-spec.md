# Interaction spec

> **Status: v1 baseline.** How things behave, as opposed to how they look. If a
> behaviour isn't written here it gets invented differently by whoever
> implements it next.
>
> `[DECIDE]` blocks something. `[ASSUMPTION]` needs your correction.

## The baseline every component owes

**States.** Default, hover, focus, active, disabled, loading, error, empty. A
component isn't done until all eight are answered — even if the answer is
"not applicable."

**Keyboard.** What Tab reaches, and what Enter, Space, Escape and the arrow
keys do. Base UI handles this for primitives; anything composed on top has to
be checked, not assumed.

**Announcement.** What a screen reader says, and — more often forgotten — what
it says when the thing *changes*. A price updating silently is a bug.

**The four data states** are a system pattern, not per-screen design work:
empty, loading, error, populated. Screen one establishes them; every screen
after inherits. Bespoke states only where the generic pattern genuinely fails.

---

## Loading

**Skeletons, not spinners.** Generic grey blocks cause layout shift on load,
which reads as unpolished and carries a measurable performance cost. Skeletons
match the shape of the content they replace.

**Partial results are normal, not exceptional.** This app aggregates up to ten
vendors. One timing out while three answer is an operating condition. Search
results render what arrived; the missing source is disclosed, not hidden.
Never block a whole screen on the slowest vendor.

`[DECIDE]` How is a missing vendor disclosed? A quiet line under the results
("some options couldn't be loaded") or something more prominent? Prominent
erodes trust in results that are actually fine; quiet risks the user thinking
they've seen everything.

---

## Price and estimate states

Budget is a hard filter inclusive of tax and fees, but not every vendor
returns a final price at search time.

Two price presentations, and they must be visually distinct:

- **Final** — all-in, filterable, trustworthy at checkout
- **Estimated** — marked by the word "from", with fees resolved later

An estimate that isn't marked and then grows at checkout undermines the whole
budget-transparency position. This is a component variant plus copy, not a
disclaimer in the footer.

**Decided: estimated-price items participate in budget filtering**, at their
low bound, and appear in Search and Explore results with the estimate marker.
They are not held outside the filter, and they are not hidden. The marker is
what makes this honest — a "from $45" item in a $0–$100 result set is exactly
what the user asked for, provided it says *from*. The consequence lands in the
cart, not here: when the real price resolves above budget, the cart raises a
*resolved above estimate* state so the user sees which item moved.

(Mirrored in `api-contract.md` → `price`, which is the client contract.)

---

## The cart card

The most stateful component in the app. Specified here because everything
else is simpler by comparison.

| State | Behaviour |
|---|---|
| **Complete** | Date, time, price set. Checkbox selected. Ready. |
| **Needs date** | Warning. Date input on the card. Blocks checkout for this item. |
| **Checking availability** | Entering a date triggers a live check. Inline loading, card stays interactive. |
| **Unavailable** | The chosen date doesn't work. Offer alternative dates, not just a rejection. |
| **Needs vendor sign-in** | Sign-in happens **on the card**. Blocks checkout for this item. |
| **Deselected** | Excluded from totals and checkout. Stays visible. |
| **Price changed** | Amount moved since it was added. Must be acknowledged, not silently updated. |

**Checkbox semantics** follow Amazon: only selected items check out. Blocked
items (needing a date or a sign-in) can't be selected until resolved.

**Announcement matters here.** Changing a date changes the total and possibly
the availability of that item. Screen reader users need the total change
announced — a live region on the budget rollup, not a silent DOM update.

### Cart header

A **stack** of contextual warnings, not one slot:

- Over budget
- *n* items need dates
- *n* items need sign-in
- *n* items unavailable

`[ASSUMPTION]` Stacked in that order, most actionable first. Each links to the
first offending card.

---

## Date entry

Dates appear in three places with different rules:

- **Search** — optional filter, no default
- **PDP** — date and time, both carried into the cart on add
- **Cart card** — required before that item can check out

**Decided: the shadcn date picker, in range mode.** The question was whether
to accept a native input's unstyleable appearance or pay for a custom
component (roving focus, arrow-key grid navigation, month announcement). The
answer is neither — shadcn's picker is vendored, already accessible, and
matches the surrounding design system, so the accessible-component cost is
paid upstream rather than by us.

Search takes a **range**, not a single date. It adds `react-day-picker` as a
dependency; that is the price of the decision and was accepted knowingly.

---

## Countdown — gift recipient

A live countdown drives the recipient's flow, and the timing rules are
unusual:

- Read the true deadline from Stripe's `capture_before`, not a hardcoded value
- **Display three days** even when the technical window is longer
- Announce at meaningful thresholds, not every second — a screen reader
  reciting seconds is unusable
- **Under 24 hours** changes presentation `[ASSUMPTION]` — more urgent
- **Expired** is a designed state, not an error page

---

## Motion

`[DECIDE]` Durations and easings are **not yet in the Figma export.** Add a
Motion group to the Primitives collection: two or three durations, two or
three easings. Until then, motion is being improvised per component.

**`prefers-reduced-motion` is respected**, and this needs care rather than a
blanket disable. Motion here carries meaning — a card entering the cart, a
package assembling in chat — so the reduced variant still has to communicate
the change. Movement becomes a fade or an instant state change, never nothing
at all.

---

## Touch targets

**Not tokens.** 24px and 44px are external constants — the WCAG floor and
Apple's HIG recommendation — not design decisions to tune in Figma. They live
as assertions in the test suite.

- **24×24px minimum** (WCAG 2.2 SC 2.5.8, AA). Asserted in all Playwright
  projects.
- **44×44px** on coarse pointers, via `@media (pointer: coarse)` in
  `theme.css`, asserted in the mobile projects. `pointer: coarse` describes the
  primary input, so a touchscreen laptop reporting `fine` keeps desktop
  density.
- **`data-target="compact"`** is the documented opt-out, floored at 32px and
  separately asserted. Secondary controls only — filter chips, segmented
  controls, tag dismiss. Never primary actions, form fields or navigation.
  More than a handful on a screen means the layout is too dense.
- **Inline links in prose are exempt** and deliberately not enlarged. Links
  that are genuinely targets carry `data-slot="button"` or `role="button"`.

**Every gesture needs a non-gesture equivalent.** Swipe-to-remove in the cart
also needs a visible button. A swipe-only surface is unusable by keyboard and
hard with assistive tech. (There is no swipe-style preference interface — see
user-flows.md §6.)

---

## Focus

- Never removed, only restyled.
- **SC 2.4.7 Focus Visible** (AA) — every interactive element has a visible
  indicator. **axe cannot reliably detect a missing focus indicator**; this is
  covered by a Playwright test that tabs through and asserts a non-`none`
  outline with non-zero width. That test exists because the suite once passed
  green while links had no indicator at all.
- **SC 1.4.11 Non-text Contrast** (AA) — 3:1 against adjacent colours.
  `Border/Focus` is `Copper/400`, which clears this on all three surfaces.
- 3px ring, 2px offset, from `--size-focus-ring` and `--size-focus-offset`.
- **Never colour alone.** `Copper/400` against `Copper/600` is roughly 1.6:1,
  so ring width and offset carry the signal.
- Dialogs and sheets trap focus and return it to the trigger on close.
- Route changes move focus to the new screen's heading.

> Not targeted: **SC 2.4.13 Focus Appearance** is AAA. **SC 2.4.11 Focus Not
> Obscured** is a separate AA criterion about sticky headers covering the
> focused element — check it once the tab bar and cart header exist, since
> both are sticky.

---

## Chat

The concierge is a primary surface, and chat has interaction requirements that
don't come free.

- **Streaming responses** need an announcement strategy. Announcing every
  token is unusable; announce on completion, with a status region for "still
  thinking."
- **Focus does not move to the response** — that would trap a keyboard user in
  a stream. It stays in the input.
- **Packages returned in chat are interactive components**, not text. They need
  the full state matrix and must be keyboard-operable.
- `[DECIDE]` Can the user interrupt a streaming response?
- **Empty state carries the load.** A blank box is a bad first impression for
  the feature that most needs adoption. Prompts, not a cursor.

---

## Status and feedback colour

Status tokens (`confirmed`, `pending`, `cancelled`, `in-progress`) are
`[DECIDE]` not yet tokenised — and with no post-purchase management in v1,
they may not be needed. What *is* needed sooner: cart-item states and the gift
lifecycle.

Until they exist, **no component may improvise one** from `destructive` or
`secondary`. See `CLAUDE.md`.

**Colour is never the only carrier** (SC 1.4.1). Every status needs a text
label or an icon alongside it.

---

## Native shell

Capacitor is v1, driven by the check-in agent.

- **Safe-area insets from the start** — the tab bar sits above the home
  indicator and under the notch. Bake this into the shell with screen one;
  retrofitting is painful.
- **Deep links land mid-app**, before auth: gift links, shared trips, check-in
  SMS. Each needs a cold-start path.
- `[DECIDE]` Do route transitions use native-feeling animation, or web
  defaults? Affects perceived quality more than most single decisions.
