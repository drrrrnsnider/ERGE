# The Booking Contract

> **Status: draft.** This is the most important document in `/docs` — it is
> what turns "60 screens" into a handful of components. Everything marked
> `[ASSUMPTION]` is my inference from the domain, not from your designs.
> Correct it before the component layer is built.

## The idea

Every booking type — flight, hotel, restaurant, rideshare, event — is the same
shape underneath:

```
time · place · confirmation · status · cost · actions
```

They differ in what fills those slots, not in what the slots are. So there is
**one component with per-type variant configs**, not five similar components.

If a sixth booking type is added later, it should be a config entry, not a new
component. If that ever stops being true, the contract is wrong and should be
revisited rather than worked around.

## The six fields

| Field | What it holds | Notes |
|---|---|---|
| **time** | One instant or a range | Flights and trains have two instants in two timezones. Hotels have two dates. Restaurants have one. This is the field most likely to break the abstraction — see below. |
| **place** | One location or an origin/destination pair | Needs a display name, an address, and coordinates for maps and directions. |
| **confirmation** | Reference code, and who issued it | May be absent — a pending booking has no code yet. Must render an empty state, not a blank. |
| **status** | `confirmed` / `pending` / `cancelled` / `in-progress` | `[DECIDE]` These four are assumed. Tokens deliberately deferred until confirmed. |
| **cost** | Amount, currency, and what it covers | `[DECIDE]` Multi-currency: does the app convert, show original, or both? Affects the component and the API contract. |
| **actions** | What the traveller can do | Varies by type *and* status. See the matrix below. |

### Where the abstraction is under most strain

**Time.** A flight is `depart 09:15 LHR / arrive 12:40 JFK`, crossing
timezones, where the elapsed duration is meaningful. A restaurant is
`19:30, local`. A hotel is `check in Tue, check out Fri` — dates, not times.

`[ASSUMPTION]` The contract holds if `time` is modelled as an optional
*range* with optional timezone per endpoint, and each type's config declares
how to render it. If that turns out to be forced, the honest fix is to make
`time` a small set of variants (instant / range / date-range) rather than
splitting the whole component.

## Per-type field matrix

`[ASSUMPTION]` — all of this needs your correction.

| | Flight | Hotel | Restaurant | Rideshare | Event |
|---|---|---|---|---|---|
| **time** | depart + arrive, 2 tz | check-in + check-out dates | single time | pickup time | start (+ end?) |
| **place** | origin + destination airports | property address | venue address | pickup + dropoff | venue address |
| **confirmation** | PNR / booking ref | reservation number | reservation name or ref | trip ID | ticket / order ref |
| **cost** | fare, per booking | per night + total | `[DECIDE]` deposit only? | estimated fare | per ticket + total |
| **type-specific** | seat, terminal, gate, baggage, airline | room type, guests, nights, board | party size, seating pref | vehicle class, driver | seat/section, doors open |

### Type-specific fields

These are the fields that *don't* fit the six. `[ASSUMPTION]` They live in a
`details` slot the config populates — a list of label/value pairs — rather than
as first-class props. That keeps the component stable as types are added.

If a type-specific field needs its own interaction (a boarding pass QR code,
say), that's a separate component slotted in, not a change to the contract.

## Actions by type and status

`[ASSUMPTION]` — this matrix drives real UI behaviour, so it's worth your time.

| Status | Available actions |
|---|---|
| `confirmed` | View details · Directions · Add to calendar · Contact provider · Modify · Cancel |
| `pending` | View details · Contact provider · Cancel request |
| `in-progress` | View details · Directions · Contact provider |
| `cancelled` | View details · Rebook |

Type overlays on top of that:

- **Flight** — check in (only within the airline's window), boarding pass
- **Hotel** — check in, room details
- **Restaurant** — modify party size
- **Rideshare** — track driver, contact driver
- **Event** — view ticket

`[DECIDE]` Which actions are real versus aspirational for v1? Every action is
an API dependency. Marking the v1 set explicitly here prevents the component
being built against a surface that doesn't exist.

## States every booking component must handle

Not optional, and cheaper to build in than to retrofit:

- **Loading** — skeleton, not a spinner, so layout doesn't jump
- **Empty** — a trip with no bookings yet
- **Error** — failed to load this booking
- **Partial** — booking exists but a field is missing (no confirmation code
  yet, no cost returned). The single most common real-world case and the one
  most often forgotten.
- **Offline** — `[DECIDE]` depends on the offline scope decision in the brief

## Layout archetypes

`[ASSUMPTION]` Five layouts covering the app:

1. **Timeline / list** — the itinerary itself, bookings in chronological order
2. **Detail** — one booking, full information, all actions
3. **Search / browse** — finding something to add
4. **Form** — booking, modifying, account settings
5. **Utility** — auth, empty states, errors, settings

## What this means for the build

- One `BookingCard` and one `BookingDetail`, each driven by a type config.
- Type configs live in one place, together, so adding a type is one file.
- Status rendering is shared and driven by the status tokens.
- The `details` slot absorbs type-specific fields without touching the core.

**Rule:** if you are about to build a second component that is 80% the same as
an existing one, the contract needs extending, not duplicating.
