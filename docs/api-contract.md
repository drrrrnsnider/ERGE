# API contract

> Stub — fill in as decisions get made.

The shared reference between this app and whoever provides the data.

**The Zod schemas in `src/lib/api/schemas/` are authoritative.** They run, they
validate real responses, and they generate the TypeScript types. When this
document disagrees with them, this document is wrong and gets fixed.

## Providers

| Domain      | Provider | Status      |
| ----------- | -------- | ----------- |
| Flights     | _TBD_    | Not started |
| Hotels      | _TBD_    | Not started |
| Restaurants | _TBD_    | Not started |
| Rideshare   | _TBD_    | Not started |
| Events      | _TBD_    | Not started |

## Cross-cutting decisions

These have to be settled once, centrally, or every provider integration invents
its own answer:

- **Time.** Itineraries cross time zones, so every timestamp is ISO 8601 with an
  explicit offset. A local time without a zone is a bug.
- **Money.** Minor units as integers plus an ISO 4217 currency code. Never
  floats.
- **Identity.** How the same hotel from two providers is recognised as one
  thing.
- **Errors.** One normalised error shape, so screens don't special-case per
  provider.
- **Partial failure.** Four providers answer, one times out — the itinerary
  still has to render. Define what a degraded response looks like.

## Per-endpoint template

### `GET /path`

**Returns:** _shape_
**Errors:** _codes and what the UI should do with each_
**Cache:** _how long the data stays fresh_
