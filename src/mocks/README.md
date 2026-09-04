# `src/mocks/` — mock data

Fake but realistic data, so screens can be built, tested and reviewed before any
provider integration exists — and so tests never depend on a live network.

**Swappable is the requirement.** Nothing outside this folder should know
whether it is talking to a mock or a real provider. Mocks satisfy the same
function signatures as [`../lib/api/`](../lib/api/README.md), and are chosen at
the boundary — an environment flag or a test-time override — never by an
`if (isMock)` branch inside a component.

## Rules

- **Validate mocks against the real schemas.** Run every fixture through its Zod
  schema in a test. A mock that can't parse is a mock that is lying to you, and
  it will hide a bug until integration day.
- **Make the data awkward on purpose.** Overnight layovers, a 27-hour itinerary
  day, a restaurant with no photo, a cancelled leg, names long enough to wrap.
  Tidy mock data produces layouts that only work on tidy data.
- **Cover the states, not just the happy path.** Empty, loading, partial, and
  failed each need a fixture, because each needs a design.

## Shape

- `fixtures/` — the data itself, one file per domain
- `handlers.ts` — mock implementations matching the `lib/api` signatures
