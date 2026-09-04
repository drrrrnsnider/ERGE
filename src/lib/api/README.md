# `src/lib/api/` — typed API layer

The boundary between our app and the outside world. Aggregating flights, hotels,
restaurants, rideshare and events means several upstream providers, each with
its own shape, reliability and idea of what a date is. Everything above this
folder sees one consistent, validated vocabulary instead.

## Zod schemas are the source of truth

Define the schema, then derive the type from it — never write the type by hand
and hope the data matches:

```ts
export const FlightSchema = z.object({
  id: z.string(),
  departsAt: z.iso.datetime(),
  carrier: z.string(),
})

export type Flight = z.infer<typeof FlightSchema>
```

One declaration gives both a compile-time type and a runtime check. A provider
that quietly changes a field then fails loudly at the boundary, with a useful
error, instead of surfacing as `undefined` somewhere deep in a component.

**Parse at the edge.** Every response goes through `.parse()` (or `.safeParse()`
where a partial failure is recoverable) before it becomes application data.
Past this folder, data is trusted because it was validated here.

The same schemas back the forms — React Hook Form validates against them via
`@hookform/resolvers/zod`, so a search form and the endpoint it posts to cannot
disagree about what a valid search is.

## Shape

- `schemas/` — Zod schemas and their inferred types
- `client.ts` — fetch wrapper: base URL, headers, error normalisation
- one module per domain (`flights.ts`, `hotels.ts`, …), each exporting typed
  functions that TanStack Query calls

Query *keys* and hooks belong with the screens that use them. This folder stays
free of React so it can be tested as plain functions.
