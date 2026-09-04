# `src/components/app/` — domain components

Components that know what this product is about: `FlightCard`,
`ItineraryTimeline`, `HotelSummary`, `RideshareEstimate`, `EventTile`.

The dividing line against [`../ui/`](../ui/README.md):

|                | `ui/`                          | `app/` (here)                     |
| -------------- | ------------------------------ | --------------------------------- |
| Knows about    | interaction patterns           | flights, hotels, itineraries      |
| Comes from     | shadcn, vendored in            | us, written by hand               |
| Reusable in    | any project                    | only this one                     |
| Talks to       | nothing                        | `@/lib/api` types, `ui/` pieces   |

A good test: if you couldn't drop the component into an unrelated app without
renaming it, it belongs here.

## Conventions

- **Compose, don't fork.** Build from `ui/` primitives rather than restyling
  them or reaching for raw HTML.
- **Take data, don't fetch it.** Components receive typed props. Data loading
  happens in the screen ([`src/routes/`](../../routes/README.md)) via TanStack
  Query, so these stay easy to test and easy to preview against mock data.
- **Type against the API layer.** Import the Zod-inferred types from
  `@/lib/api` rather than redeclaring shapes, so a contract change surfaces here
  as a type error.
