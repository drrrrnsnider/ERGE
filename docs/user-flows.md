# User flows

> **Status: v1 baseline.** Decisions confirmed in review are stated plainly.
> `[ASSUMPTION]` still needs correcting. `[DECIDE]` will block something later.
> `[V2]` marks something deliberately deferred with a note on how v1 stays
> compatible with it.

## Template

**Trigger:** what starts it
**Success:** what the person has at the end
**Detours:** every state that isn't the happy path — each needs designing

---

## 0. The constants

**Budget** — min/max range, total (not per person), inclusive of tax and fees
where the vendor supplies them. Hard filter on Explore and Search; a target
that drives suggestions on Cart, Trips and Lists.

**Group size** — paired with budget. Changes the maths, not what's shown.

**Date** — an *optional* filter on search results. Not a gate, not a global
setting. **Times live on the experience detail page only**, since availability
is per-item.

**In the cart, date lives on the card**, not in a global control. The cart
header shows a rollup of the date range across items.
`[V2]` A top-level "suggested date" that pre-populates each card is a later
refinement, not v1.

---

## 1. Self-discovery → build → book

The primary loop.

**Trigger:** user opens the app with an occasion in mind.
**Success:** a booked evening, receipt in hand.

1. **Explore** — curated categories, promos, suggestions shaped by known
   interests. Budget and group size visible.
2. **Search / filter**, with optional date filter, or **map view** for
   geographically-driven browsing.
3. **Experience detail (PDP)** — the anchor. Price, availability, times.
4. **Add to cart.** If a date and time were selected on the PDP, **they carry
   into the cart**. Adding without them is allowed.
   `[ASSUMPTION]` A "build my night around this" action hands the anchor to the
   concierge and jumps to flow 2.
5. **Cart** — the assembled evening, budget running total, suggestions to fill
   gaps or swap for cheaper alternatives.
6. **Checkout** → **Payment** → **Confirmation**.

**Detours:** nothing within budget · nothing available on the chosen date · the
anchor is available but nothing nearby fits · price changed between PDP and
cart · user returns days later to a stale cart.

---

## 2. Concierge → package → book

Equal to flow 1, not subordinate.

**Trigger:** user opens chat, or hands an anchor over from a PDP.
**Success:** an assembled package in the cart, then booked.

1. **Chat empty state** — prompts, not a blank box.
2. **Clarifying questions** — occasion, budget, time, area, interests.
   `[DECIDE]` How many before it produces something? Each is friction against
   the one principle.
3. **Packages returned** — 2–3 complete evenings, each with a total and a
   rationale. Not a list of links.
4. **Refine** — swap an item, shift the time, cheaper version.
5. **Accept** → **merges into the cart**, with an option to check out
   immediately.

`[V2]` Replace-versus-merge, and saved carts. See §3.1 for the one modelling
decision that keeps v1 compatible.

**Detours:** AI can't fill the budget · no availability for the shape requested
· user rejects all packages · an item sells out between suggestion and cart ·
**merging pushes the cart over budget** — needs a header warning.

---

## 3. The cart

The most stateful screen in the app. Worth designing first — everything else
is easier by comparison.

**Per-card state:**

- Date and time set (carried from PDP, or entered here)
- **Needs date** — warning state
- **Needs vendor sign-in** — sign-in happens *on the card*
- **Unavailable** on the chosen date
- **Checking availability** — entering a date triggers a live check
- **Deselected** — Amazon-style checkboxes; only selected items check out

**Header:** budget rollup, date range rollup, group size, and a **stack of
contextual warnings** — over budget, items needing dates, items needing
sign-in. Not a single warning slot.

**Rule:** items that need a vendor sign-in cannot be checked out until signed
in. They're flagged on the card and summarised in the header banner.

### 3.1 Persistence `[DEV]`

Cart works **signed out**. Web and native are separate storage sandboxes — a
cart built in mobile Safari will not appear in the native app on the same
phone, and Safari's tracking prevention caps script-writable storage lifetime
at around seven days, so a purely client-side cart quietly disappears.

**Use an anonymous server-side cart:** on first add, the server mints an
anonymous ID; the device stores only that token; the cart lives server-side.
Account creation then *claims* the existing cart rather than rebuilding it.
Cross-device still requires an account — which is the correct incentive.

**Model the cart as a collection with an ID and an `active` flag, not a
singleton.** This costs nothing now and makes `[V2]` saved carts a data change
rather than an architecture change. It also puts the cart in the same
collection abstraction as trips and wishlists.

---

## 4. Checkout `[DECIDE — highest priority]`

Where "one click books them all" meets four vendors with different
capabilities.

Selected items only. Items needing vendor sign-in are already excluded by the
cart rules, which removes one failure mode from this flow.

**Still to decide:**

- **Sequencing.** All at once, or in order? A restaurant booked before a show
  sells out leaves half an evening.
- **Failure handling.** Some bookings can't be cancelled once made, so true
  rollback may be impossible. **Partially succeeded checkout is a normal
  state, not an error.**
- **Deep-link items** — rides are confirmed as post-checkout ("get a ride to
  dinner"). Any other categories?

`[ASSUMPTION]` Attempt all, report per item, give a recovery path for each
failure. "3 of 4 booked, here's what to do about the fourth" beats a spinner
pretending atomicity exists.

**At confirmation:** an opt-in for the check-in — *"We'll check in after your
last event"* — which the user can uncheck. See flow 8.

**Guest checkout is allowed** where the vendor permits it. The account prompt
comes **after** first checkout.

**Detours:** payment declined after some bookings succeeded · vendor timeout
with unknown outcome · price rose between cart and capture · abandonment
mid-sequence.

---

## 5. Account creation

Deliberately late. Full discovery and checkout work signed out.

**Three prompts, all contextual — there is no other way in:**

1. **After first checkout** — framed around the check-in, not around
   housekeeping. *"We'll text you after your night to help with what's next"*
   is a better reason than *"save your preferences."*
2. **On any save attempt** — saving an experience, creating a wishlist or a
   trip requires an account.
3. **Tapping the Profile tab while signed out.**

Preferences are only ever saved against an account. Nothing is collected from
a signed-out user, and nothing asks them for it.

`[DECIDE]` Do guests get the check-in by SMS anyway, or is it account-only?
Guests have no push token, so SMS is the only route — and the check-in is the
strongest reason to create an account.

---

## 6. Browse to teach

**Trigger:** ordinary use — saving, booking, organising.
**Success:** better suggestions on Explore.

There is no preference-gathering surface and no prompt. Signal is **ambient**:
it comes from what the user saves, books and puts in lists, and all of those
require an account (§5). Nothing asks a user what they like; the app learns
from what they do.

1. Saving an experience → Library (requires an account).
2. Booking.
3. Organising saves into lists.

**Cold start is the default, not a detour.** Every signed-out user, and every
new account with no activity yet, has given the app nothing. Explore has to be
good with zero signal — curated rails, guides, promotions — and it must not
ask for anything to get there. A prompt, a swipe surface or an onboarding step
would each add friction before the first thing the user came for, which loses
to the one principle.

---

## 7. Social ingest `[ASSUMPTION]`

**Trigger:** user shares a post, reel or link into the app.
**Success:** the AI extracts intent and surfaces matching experiences.

`[DECIDE]` What happens when it can't parse the content, or matches nothing in
an available city? Failing silently on a share is a poor first impression.

---

## 8. Gifting — gifter side

**Trigger:** recipient shares a wishlist link.
**Success:** a gift funded, recipient notified.

1. Open the shared list. `[DECIDE]` Account required, or open?
2. See experiences with prices. `[ASSUMPTION]` Filterable by "my budget is
   $50," surfacing what that covers.
3. Choose one, pay. **Each item can be gifted once** — funded items move to
   the purchased state and can't be selected again.
4. Authorisation hold placed; recipient notified.

**The list owner sees two tabs: unpurchased and purchased.**

**Detours:** budget covers nothing on the list · the experience is unavailable
· two gifters open the same item simultaneously — needs a claim mechanism, not
just a state.

---

## 9. Gifting — recipient side

The tightest flow in the product, because it runs on a clock.

**Trigger:** push, email and SMS.
**Success:** booked, before the hold expires.

1. Open the gift — what it is, who from, **a live countdown**.
2. Accept.
3. Choose a date and time from available slots.
4. Confirm → booking made, payment captured.

**Display three days.** Read the true deadline from Stripe's `capture_before`
rather than hardcoding it.

**Detours — all need designing:**

- **No availability inside the window** — the likeliest failure
- **Expiry** — funds release; the only recourse is asking the gifter to resend,
  handled outside the app
- Recipient doesn't want it `[DECIDE]` — decline, or let it lapse?
- Price rose above the held amount
- **Recipient has no account** — this flow must work cold, from a link

---

## 10. Post-booking check-in

The differentiator.

**Trigger:** after the **last** event of the evening — not per booking.
**Delivery: SMS**, with links to three options. Text rather than push means it
reaches guests too, who have no push token.

**Success:** the evening continues; ideally a second booking.

1. Text message: *"How was your night? Here's what's still open nearby."*
2. Three options, linked. Bookable ones and free ones — the overlook, the
   rooftop view. This is the most plausible home for the hidden-gems ambition,
   since a suggestion needs no inventory and no integration.
3. Link opens the app (or web) into chat with the evening's context loaded.
4. Optionally straight to cart and checkout.

### Consent `[LEGAL — flag before building]`

A "what's next, here are three options" text is **promotional in character**,
not purely transactional, which in the US brings it under TCPA consent rules
rather than the looser treatment a booking confirmation receives.

The checkout checkbox is the consent mechanism, so its wording is doing legal
work:

- Say plainly that it's a **text message** and may include suggestions
- Prefer **unchecked by default**; if checked, make it unmistakable
- **Record the consent** — timestamp, and the exact wording shown
- Every message carries a working **STOP**

Worth a short conversation with whoever handles legal before this is built.

`[DECIDE]` Quiet hours. What happens if the last event ends at 1am?

---

## Navigation

**Five tabs:** Explore · Concierge · Cart · Library · Profile

- **Library** is tabbed internally for the three groupings — saved
  experiences, wishlists, trips.
- **Cart as a tab** is unusual but earned here: it's the assembly surface, not
  a checkout queue, and a trip is a saved cart.
- **Profile** was originally top-nav on Explore only; promoted to a tab.

`[DECIDE]` Desktop — sidebar or top nav?

**Deep links must work cold, before auth:** a gift link, a shared trip, and a
check-in SMS all land mid-app. The gift link in particular arrives from someone
with no account at all.
