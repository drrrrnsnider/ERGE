# API contract

> **Status: v1 baseline.** The shared reference between this app and whoever
> provides the data.
>
> **Scope:** this document describes what the *frontend* consumes — normalised
> shapes, states and failure modes. Vendor selection, commercial terms and
> integration sequencing live in the **API Roadmap**, which is BIZ-owned.
> Where the two disagree about a data shape, this document is the client
> contract; where they disagree about a vendor, the Roadmap wins.
>
> **The Zod schemas in `src/lib/api/schemas/` are authoritative.** They run,
> they validate real responses, and they generate the TypeScript types. When
> this document disagrees with them, this document is wrong and gets fixed.

## The central principle

**The frontend never sees a vendor-shaped response.** Every provider is
normalised server-side into the shapes below. A restaurant from Yelp
Reservations and a tour from Viator arrive as the same `Experience`, differing
only in fields the client already knows how to render.

If the client ever needs to branch on which vendor supplied something, the
normalisation layer has failed and should be fixed rather than worked around.

---

## Cross-cutting decisions

Settled once, centrally, or every integration invents its own answer.

**Time.** Every timestamp is ISO 8601 with an explicit offset. A local time
without a zone is a bug. Experiences carry their venue's timezone —
"7:30pm" means 7:30pm where the restaurant is, and the client must not
silently convert to device time.

**Money.** Minor units as integers plus an ISO 4217 currency code. Never
floats. `{ amount: 4500, currency: "USD" }` is $45.00.

**Identity.** Experiences are keyed on **Google Place ID**. This is how the
same venue from two providers resolves to one thing, and it's already the
Roadmap's position. Not every experience has one — a tour operator's
"sunset kayak" isn't a place — so the key is `placeId` where available, with
an internal `experienceId` as the durable primary key.

**Errors.** One normalised shape. Screens never special-case per provider.

```
{ code, message, retryable, vendorId?, field? }
```

`code` is from a closed set the client can branch on. `message` is
user-facing and written by us, not passed through from a vendor.

**Partial failure is an operating condition, not an error.** Up to ten
providers answer a search. One timing out while others succeed must render.
Every list response carries which sources answered and which didn't.

---

## Vendor access tiers (D1)

The single most consequential unknown, and the client must handle all three
without redesign. Every bookable thing declares its tier:

| Tier | Meaning | Client behaviour |
|---|---|---|
| `full` | Complete booking API | Books in-app. Nothing special. |
| `authenticated` | Books in-app, user must link the vendor account | Card shows sign-in state. Blocks checkout until linked. |
| `deeplink` | Cannot book programmatically | Excluded from cart. Surfaced post-checkout as a suggested action. |

Per Playbook §12.4, both booking paths are designed against the same component
contract, so a vendor moving from `deeplink` to `full` is a config change, not
a redesign.

`[DECIDE]` Rides are confirmed as `deeplink`, post-checkout. Which other
categories land there?

---

## `Experience`

The polymorphic core. The same object renders in Explore, search results, the
map, the PDP, a cart card, a list row and a chat package.

```
experienceId        durable primary key
placeId             Google Place ID, where applicable
title
category            dining | event | tour | wellness | transport | gift | ...
vendorId
accessTier          full | authenticated | deeplink
location            { lat, lng, address, timezone }
images[]            from the vendor, not the design file
price               see below
availability        see below
details[]           label/value pairs — type-specific fields live here
```

**`details[]` absorbs type-specific fields** — party size, duration, seat
class, dietary options — as label/value pairs rather than first-class props.
That keeps the component stable as categories are added. Anything needing its
own interaction is a separate component slotted in, not a change to this
shape.

### `price`

Two presentations, and they must be distinguishable by the client:

```
{ kind: "final",     total, currency, taxesIncluded: true }
{ kind: "from",      base,  currency, taxesIncluded: false }
```

`from` is a **base rate excluding fees**. The word "from" is what marks it —
copy reads "from $45 / couple", never an implied all-in figure. An earlier
build appended "+ fees" as well; that is removed, because doubling the hedge
made the line harder to scan without making it more honest.

**Budget filtering — decided.** `from` items **participate** in budget
filtering, at their low bound. A "from $45" item appears in a $0–$100 search,
marked as an estimate; it is never hidden behind the filter or shown outside
it. The real price resolves when a date is entered, and if it then exceeds
budget the cart raises a *resolved above estimate* state — distinct from
generic over-budget, so the user sees which item moved and by how much.

(Mirrored in `interaction-spec.md` → *Price and estimate states*. If the two
ever disagree again, this document is the client contract and wins.)

### Fields the Explore design needs that this contract lacks `[ASSUMPTION]`

Three, added client-side so the screen could be built. Each is a real gap in
the normalised shape, not a rendering convenience:

- **`price.unit`** — the design writes "from $45 / couple", "from $89 /
  person", "from $45 / bouquet". It cannot be derived from `category`: a
  restaurant is per person and a picnic per couple, and both are `dining`.
- **`summary`** — a short descriptor ("City views & candlelight"). The two
  card sizes show DIFFERENT metadata: the large card reads
  `summary • duration`, the compact one `address • duration`. That is a
  design decision, so the summary is its own field rather than a `details[]`
  entry found by label.
- **`elite`** — a curation marker that draws a badge and a copper stroke.
  Deliberately NOT `accessTier`, which is about whether we can book the thing;
  the two are independent.

Also unmodelled, and currently faked: `Card / Media MD` renders a hero plus
**three thumbnails**, so it wants four images. `images[]` says nothing about
ordering or a hero/thumbnail distinction.

### `availability`

```
{ status: "available" | "unavailable" | "unknown", slots?: [...] }
```

`unknown` is legitimate and common — availability often can't be determined
without a date. It is never an error.

**It is not surfaced on a card.** Explore's cards show title, meta and price
and nothing else, so a status line there would be inventing chrome the design
does not have. Availability belongs on the PDP, where a date can actually be
chosen, and in the cart, where it blocks checkout.

---

## `Collection`

Cart, Trip, Wishlist, List and Saved are one shape with different metadata
and actions.

```
collectionId
kind         cart | trip | wishlist | list | saved
active       boolean — supports [V2] multiple saved carts
name?
budget?      { min, max, currency }   total, not per person
groupSize?
dates?       { start, end } — rollup, derived from items
items[]      { experienceId, date?, time?, selected, giftedBy? }
```

**Modelled as a collection with an id and an `active` flag, never a
singleton.** This costs nothing now and makes `[V2]` saved carts a data change
rather than an architecture change.

### Anonymous carts

The cart works signed out. Web and native are separate storage sandboxes, and
Safari's tracking prevention caps script-writable storage lifetime — so a
purely client-side cart quietly disappears.

**Server-side anonymous cart:** on first add, the server mints an anonymous
id; the device stores only that token; the cart lives server-side. Account
creation **claims** the existing cart rather than rebuilding it.

`[DECIDE — DEV]` Claim semantics when a user with an existing account signs in
on a device holding an anonymous cart. Merge, replace, or ask?

---

## Checkout

The hardest part of the contract.

**Request:** the selected items only. Items in `authenticated` tier without a
linked account, or missing a date, are already excluded by cart rules.

**Response is per-item, not atomic:**

```
{
  checkoutId,
  results: [
    { experienceId, status: "booked" | "failed" | "pending", confirmation?, error? }
  ]
}
```

**Some bookings cannot be cancelled once made**, so true rollback may be
impossible. Partially succeeded checkout is therefore a **normal state**, and
the confirmation screen must handle it: "3 of 4 booked, here's what to do
about the fourth."

`[DECIDE]` Sequencing — all at once, or ordered? A restaurant booked before a
show sells out leaves half an evening. This is a product decision with real
consequences and it isn't settled.

`status: "pending"` covers vendor timeouts with unknown outcome. The client
must not assume failure — double-booking is worse than an ambiguous state.

**Guest checkout is permitted** where the vendor allows it. The account prompt
follows first checkout.

---

## Gifting

```
giftId
experienceId
fromName
amountHeld        { amount, currency }
captureBefore     ISO 8601 — the real deadline, from Stripe
status            held | accepted | booked | expired | declined
```

**`captureBefore` comes from Stripe's `capture_before` on the charge** and is
never hardcoded client-side. Authorisation rules change without notice, and
the standard 7-day window is shorter on some networks.

The client **displays three days** regardless, giving margin for the recipient
to choose a slot and the vendor to confirm.

**Wishlist items gift once.** Funding moves the item to a purchased state.
`[DECIDE — DEV]` Two gifters opening the same item simultaneously needs a
**claim** — a short soft-lock on open — not just a status check at payment.
Whoever pays second has already entered card details.

**Expiry releases funds.** The recipient's only recourse is asking the gifter
to resend, handled outside the app.

---

## Concierge

```
POST /concierge/message   → streamed response
```

- **Packages returned are structured**, not prose with links. The client
  renders them as interactive components with a full state matrix.
- Every package carries a total, a rationale, and full `Experience` objects —
  not ids the client must resolve separately.
- **Accepting merges into the cart** (v1), with an option to check out
  immediately.
- `[DECIDE]` Can the client interrupt a stream?

`[DECIDE]` What context does the concierge receive — saved experiences, past
bookings, stated preferences? This is a privacy question as much as a product
one, and it should be answered explicitly rather than by whatever the
implementation happens to pass.

---

## Check-in

Scheduled after the **last** event of an evening, delivered by **SMS** so it
reaches guests without accounts.

```
checkinId
scheduledFor      ISO 8601 with offset — venue timezone, not device
consentedAt       timestamp
consentText       the exact wording the user was shown
suggestions[]     three options, each a full Experience or a free suggestion
```

**Consent is recorded, not inferred.** The checkout opt-in is a legal artifact:
a "what's next, here are three options" text is promotional in character, not
purely transactional, which in the US brings it under TCPA rules. Store the
timestamp and the exact wording shown, and every message carries a working
STOP.

`[DECIDE]` Quiet hours. What happens when the last event ends at 1am?

---

## Explore

The first screen, and the cold-start screen. Split into **three** calls rather
than one, because states are per-section: a single call could only fail as a
whole, and one slow vendor would hold the entire page.

### `GET /explore/layout`

**Returns:** `{ signal, sections[] }` — the ordered list of sections and how
to draw each. `signal` is `none` for a user the app knows nothing about,
which is everyone signed out; it exists so a personalised layout is a data
change rather than a client change.

Section kinds: `rail` (fetched separately, below), `collage` (drawn from the
user's own collections), `editorial` (inline promo content — see below).

**Cache:** long. This is close to static.
**Partial:** not applicable; without a layout there is no screen.

### `GET /explore/section/:id`

**Returns:** `{ items[], sources: { answered[], failed[] } }`
**Errors:** any normalised code. The client renders the error **inside that
section only** and offers a retry when `retryable`.
**Cache:** short — items are filtered by budget, which the user changes live.
**Partial:** `sources.failed` names vendors that did not answer while others
did. The section still renders what arrived.

Filtered by `{ budget: { min, max, currency }, groupSize }`. Budget is a
**hard** filter, and `from`-priced items participate at their low bound.

### `GET /explore/collage/:id`

**Returns:** `{ caption?, items[] }`, items being a subset of `Experience`.
Empty for any user with no collections, which is the cold-start default and a
designed empty state rather than a failure.

### Editorial content `[ASSUMPTION]`

The two promo cards are **not** `Experience` objects — they carry no price,
availability, location, vendor or access tier, and one of them is not
bookable at all. They are modelled client-side, discriminated on `kind`:

```
{ kind: "guides",    id, badge, headline, entries[{ id, label, href }] }
{ kind: "promotion", id, badge, headline, caption, cta { label, href } }
```

There is no server contract for this yet, and `design-brief.md` puts
CMS-dependent editorial out of v1 pending **D9**. Expect this to be replaced
or deleted when D9 resolves; it is deliberately small.

---

## Search

The search screens. The takeover at `/search` is built; the results screen is
not yet, so only what the takeover needs is settled here.

### `GET /experiences?ids=a,b,c`

**Returns:** `{ items[] }` — no `sources` block, unlike a section. That block
exists so a SEARCH can disclose which vendors failed to answer; a lookup by
id either finds a thing or does not, and there is no partial answer to
disclose.
**Errors:** any normalised code. The client renders the error in place of the
list and offers a retry when `retryable`.
**Cache:** normal. These are whole experiences, not a filtered view of them.
**Auth:** none. Ids come from the device, not from an account.

**The response may be SHORTER than the ids asked for, and clients must cope.**
An experience can be delisted between being viewed and being asked for again,
and that is an ordinary outcome rather than an error — the row is dropped
from the list. **Order follows the request**, so a caller's own ordering
(most-recently-viewed first) survives the round trip.

Recently viewed is the first caller. The device stores **ids only**, never
copies of experiences: a stored copy goes stale the moment a price changes
and becomes a second source of truth for the same object, which is what this
contract exists to prevent. `src/lib/recents.ts` holds the ids;
`src/lib/storage.ts` is the seam that will become Capacitor Preferences.

### Recent searches `[LOCAL]`

Not an endpoint, and deliberately so. Recent searches are about this device,
have to work with no network, and are nobody else's business, so they never
leave it. If they ever become account-level — synced across a user's phone
and laptop — that is a product decision with a privacy question attached, not
a refactor.

## Endpoint template

### `GET /path`

**Returns:** shape
**Errors:** codes, and what the UI does with each
**Cache:** how long the data stays fresh
**Partial:** what a degraded response looks like

---

## Conflicts with the API Roadmap to resolve

Recorded here so they're resolved deliberately rather than discovered:

1. **Integration count.** V1 is capped at **10**. The Roadmap's matrix spans
   roughly forty providers across eight segments. The cap should drive
   selection.

2. **Access tiers are assumed, not confirmed.** The Roadmap marks most
   providers "free to plug in." An API existing is not the same as a
   pre-launch company being granted access — several listed providers are
   application-gated or negotiated-only. Each candidate needs its tier
   confirmed before it's designed against (D1).

3. **Group escrow** is Roadmap Phase 2 and a stated product pillar, but is
   **out of v1 scope** per `design-brief.md`. Confirm.

4. **Dating and social graph providers** (Matchbox, Amity) are in the Roadmap
   matrix and explicitly **years out** per product direction.

5. **Rideshare price buffer.** The Roadmap specifies a mandatory 15% buffer
   applied at checkout and not disclosed, presented to the user as a discount.
   That is undisclosed markup, and it sits directly against the
   budget-transparency positioning this product is built on — as well as US
   rules on hidden mandatory fees. **Flag to BIZ/legal before any pricing UI
   is built.**

6. **Webview credential injection.** The Roadmap describes deploying a
   webview that auto-fills user credentials to complete checkout on venues
   that block API access. This means storing users' third-party passwords and
   automating against sites that have declined access. **Do not build this.**
   It is a security liability and likely a terms-of-service and
   computer-misuse problem. Escalate rather than implement.
