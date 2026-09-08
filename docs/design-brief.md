# Design brief

> **Status: v1 baseline**, assembled from the Erge Playbook, API Roadmap,
> Launch Deck and the product decisions confirmed in review.
>
> `[DECIDE]` marks an open question. Decisions carried in the Playbook's Open
> Decisions Register are referenced as D1–D10 rather than duplicated — that
> register is the live version.

## The problem

Planning a night out means five tabs, five checkouts, hidden fees, and no
confidence the pieces fit together. The friction is worst for exactly the
people with the least margin for error: someone planning a first date that has
to land, an anniversary that matters, a group trip where one person fronts the
cost.

Erge collapses that into one basket. Build the evening, tap once, book it all.

## Who it's for

**Someone planning a specific occasion**, not a frequent traveller managing
logistics. First dates, anniversaries, birthdays — growing into family
holidays and bachelor/bachelorette trips.

**Attainable, not aspirational.** Middle to lower-middle income. Budget is not
a filter tucked in a menu; it is the organising principle of the interface.
This is the clearest differentiator from competitors skewing upmarket.

**Secondary mode: browsing.** Users spend idle time exploring options. That
browsing is not a side activity — it is how the app learns preferences well
enough to make good suggestions later. The learning is ambient — from saves,
bookings and lists, all of which require an account — never from a prompt or
a preference-gathering surface. See user-flows.md §5–6.

### Not the audience yet

The social graph, public profiles and courtship features described in the
Playbook are **years out**. V1 has no public profiles — sharing is a link the
user sends directly.

## The two paths in

Both must work. Neither is subordinate.

**1. Self-discovery.** Browse or search, find an anchor — a specific
restaurant, a show — and build around it.

**2. Concierge.** Give the AI a budget, a time constraint and an occasion; get
assembled packages back. *"Dinner here. Want to go earlier? Cocktails nearby
first. Walk up to this overlook for sunset."*

The anchor pattern matters: a user arriving with one thing in mind should be
able to hand it to the concierge and get an evening built around it.

## Principles

**1. Remove planning fatigue.** The only principle for v1, and the one that
settles arguments. If a decision adds a step, a tab, or a second checkout, it
loses. "Streamline" is not a slogan here — one click books the whole
itinerary.

*Loses to:* nothing in v1. If something must be complex, that is a signal the
feature is wrong.

### Aspiration, not yet a principle

**The "it factor" — hidden gems.** A scenic overlook, a rooftop with a view, a
free thing that makes a cheap night feel expensive. This is where the product
would become genuinely differentiated, and it is deliberately *not* claimed as
a principle because there is no way to deliver it at scale today: it isn't an
API integration and it isn't proprietary data we can afford to build.

`[ASSUMPTION]` The most plausible v1 route is the **post-booking check-in**
(below) — an agent suggesting a nearby overlook at 9pm needs no bookable
inventory and no integration. Worth treating as the first experiment.

**Supporting independent local business** is a value, not a v1 capability. It
implies custom integrations that only make sense after the model is proven.

## V1 scope

| Area | In v1 |
|---|---|
| **Discovery** | Explore, search, filter, map results, experience detail |
| **Library** | Saved experiences, wishlists, lists, list detail |
| **Trips** | Trip detail — experiences, costs, dates, group size, budget, include/exclude |
| **Cart** | `[NEW]` Not yet designed. See below. |
| **Checkout** | Single and multi-item, payment, confirmation |
| **Concierge** | Chat: empty state, conversation, clarifying questions, package suggestions |
| **Gifting** | Share a wishlist by link; a gifter funds a specific experience |
| **Post-booking** | Receipt, vendor hand-off for changes, and the check-in agent |
| **Social ingest** | Share content into the app; the AI reads it to learn interests |

### The unifying structure

**Cart, Trip, Wishlist, List and Saved are one thing** — a collection of
experiences — differing in metadata and available actions:

| | Metadata | Primary action |
|---|---|---|
| Cart | budget, group size | Check out |
| Trip | budget, group size, dates, name | Check out, share, edit |
| Wishlist | budget hint, occasion | Share for gifting |
| List | name | Organise |
| Saved | none | Move into one of the above |

A trip is a saved cart with more metadata. The cart should be near-identical to
trip detail. `[ASSUMPTION]` If this holds, most of the screen list collapses
into one list archetype and one detail archetype — the largest available scope
reduction in the project.

### The cart is missing and needs designing

Modelled on Amazon: a place to gather current thinking, with fast actions to
save for later, move to a wishlist, or move to a trip. Because a trip *is* a
cart, designing this well designs trip detail at the same time.

## Budget

Front and centre on Explore, Search, Cart, Trips and Lists.

- **Min/max range**, Zillow-style, as a **hard filter** on Explore and Search.
- **Total, not per person**, paired with a **group size** selector.
- **Includes taxes and fees.**
- On Cart, Trips and Lists it behaves as a *target*: narrow the options, or
  suggest cheaper alternatives to what the user has picked.

`[DECIDE — design]` Not every vendor returns a final price at search time.
All-in pricing is preferred but **not a blocker**, so results from vendors that
can't must be visibly marked as estimates, and budget filtering is approximate
for them. This needs a component variant and copy, or the Benefit Shield
promise is undermined by a price that grows at checkout.

`[ASSUMPTION]` Group size affects budget maths but not what is shown — a table
for two and a table for six are the same restaurant.

## Gifting

V1, by share link only. No public profiles.

**Mechanism:** the gifter pays; an authorisation hold is placed; the recipient
chooses a slot; the booking is made and the payment captured on confirmation.

**The hold expires.** A standard online card authorisation is typically valid
for 7 days, and Visa is effectively shorter — around 4 days 18 hours for some
transaction types. Extended authorisations reach up to 30 days but are
restricted by card network, merchant category and Stripe pricing tier, so they
should not be assumed available.

Design consequences:

- Recipient is notified by **push, email and SMS**, and told they must accept
  and book within the window.
- **Display 3 days**, not 4 — capture happens after the vendor confirms, not
  when the recipient taps accept, so the promise needs margin under the floor.
- Read the real deadline from Stripe's `capture_before` on the charge rather
  than hardcoding it; authorisation rules change without notice.
- **A live countdown** is part of the recipient's view.
- **Expiry is a designed state:** the gift lapses, funds release, and the
  recipient's only recourse is to ask the gifter to send the link again —
  handled outside the app.

`[DECIDE — DEV]` Worth asking whether a saved payment method plus authorisation
to charge later is preferable to a live hold. No clock, different risk profile,
materially different screens.

## Post-booking

**We do not manage bookings after purchase.** Bookings are made directly with
the provider via API; the user gets a receipt listing what was purchased and
where to go to change it — the Expedia model. No modify, no cancel, no status
management in v1.

**Except: the check-in agent.** Roughly 90 minutes after a dinner reservation
starts, the agent asks *"what's next?"* and suggests ways to continue the
evening.

This is the most differentiated thing in the product, and the most plausible
home for the hidden-gems ambition. It also carries real requirements:

- Push notifications → **Capacitor is v1**, not deferred
- Structured booking times stored after checkout — so post-purchase *data*
  exists even though post-purchase *management* does not
- Deep link from notification into a chat thread with context loaded

`[ASSUMPTION]` The agent suggests; it does not auto-book.

## Vendor integration

Capped at **10 integrations** for v1. Current candidates: Florist One
(flowers), Uber / Lyft (rides), Sabre or Duffel (flights, hotels, cars), Viator
(excursions), TodayTix (cultural events).

**Access tiers differ, and the seamless promise bends accordingly** (D1). Some
vendors give full booking APIs; some require the user to log in on first
booking; some are deep-link only. Uber is expected to be deep-link initially,
surfaced *after* checkout as "get a ride to dinner."

Per Playbook §12.4, **both booking paths are designed against the same
component contract**, so a vendor moving from deep link to full API is a
variant config change rather than a redesign. This is a stated strategy, not a
discovery to be made at the checkout screen.

## Constraints

- **Mobile-first.** Phone is primary; desktop is the adaptation.
- **Capacitor native shell**, iOS and Android, plus web — one codebase.
- **WCAG 2.2 AA**, enforced at the token layer and asserted in tests.
- **Dark theme only.** `[DECIDE]` Revisit — outdoor daylight use is common.
- **Small team, low budget.** One designer building the frontend; senior React
  dev reviews at three checkpoints.
- **Images come from partner APIs**, not the design file.

## Out of scope for v1

- Public profiles, the social graph, courtship features — years out
- Post-purchase modification, cancellation, status tracking
- Group escrow / split payment `[DECIDE]` — confirm this is v2
- Supporting-local-business integrations
- Any CMS-dependent editorial content until D9 resolves

## Divergences from the Playbook to reconcile

The build has deliberately departed from Playbook v0.2 in four places. Update
the Playbook, not the code:

1. **Base UI**, not Radix — shadcn changed its default; decided at scaffold.
2. **Touch targets are not tokens** — 24px and 44px are external constants,
   asserted in the test suite, with `data-target="compact"` as a floored
   opt-out.
3. **Capacitor was deferred** — now reversed by the check-in agent requirement.
   Bring forward.
4. **The no-raw-hex lint rule is missing** — it is in the Playbook's own
   Definition of Done and is a genuine gap. Add it.

Also worth flagging: Playbook §1 states that **code is the source of truth**
and the design surface renders from it. The PM brief that initiated this build
said Figma remains master. The Playbook position is the one being built —
confirm the PM knows.
