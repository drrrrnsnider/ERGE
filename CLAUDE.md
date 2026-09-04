# ERGE — Frontend

## What this is

A concierge trip-planning app. It aggregates flights, hotels, restaurants,
rideshare and events into a single unified itinerary.

Mobile-first responsive. The web build is wrapped for the App Store and Google
Play later via Capacitor — App Store presence is a firm business requirement, so
never assume desktop-only or web-only.

Small team, low budget. Prefer boring, well-supported solutions over clever ones.

## Who you're working with

Darrin — head of design and product, sole designer, owner of the design system
and front-end architecture. Strong HTML and CSS. Limited JavaScript and React.

This changes how you should work:

- Explain structural decisions in plain language **before** making them, not after.
- If a choice has a tradeoff that would need to be understood to maintain this
  code later, stop and ask rather than picking silently.
- Don't assume familiarity with build tooling, module resolution, or type system
  behaviour. Say what a thing does, not just what you did.
- Prefer the option that is easier to reason about six weeks from now over the
  option that is marginally more elegant.

## Stack

These are decided. Don't substitute alternatives without asking.

- **Vite + React + TypeScript** — `strict`, plus `noUncheckedIndexedAccess` and
  `erasableSyntaxOnly`. Vite's `react-ts` template already turns `strict` on;
  those other two are the additions, and they're the ones you'll actually feel
- **React Router** for routing
- **Tailwind CSS v4** — no config file, no PostCSS. Configuration lives in CSS
  via `@theme`.
- **shadcn/ui on Base UI** (`base-nova` style). Not Radix.
- **Lucide** for icons
- **TanStack Query** for server state
- **React Hook Form + Zod** for forms and validation
- **Vitest** for unit tests, **Playwright** for browser tests, **axe-core** for
  accessibility
- **oxlint** for linting

Deliberately deferred — **do not add these**: Storybook, Chromatic, Capacitor,
PWA plugin, state management libraries. Each has a named trigger for when it
gets introduced. Adding them early is scope creep, not thoroughness.

## Token architecture

This is the most important section in this file.

There are three layers, and they have strict roles:

| Layer | File | Role | Editable |
|---|---|---|---|
| Primitives | `src/tokens/tokens.css` | `brand-600 is #1266d6` | **Never by hand** |
| Bridge | `src/styles/theme.css` | `primary IS brand-600` | Yes — freely |
| Components | `src/components/ui/*` | `the button uses primary` | Avoid — vendored |

`tokens.css` is *meant* to be generated from Figma variables exported as DTCG
JSON, one way: Figma → JSON → CSS.

**That pipeline does not exist yet.** There is no `design/tokens.figma.json`
(the path the file cites as its source), no transform script, and no Figma
export. The values in there now are placeholders picked to pass WCAG AA so the
app is usable — the file's own header says so.

Treat it as generated regardless. The first real export replaces the file
wholesale, so anything hand-edited is destroyed the moment the pipeline lands.

### Rules

- **Never** write a hex, `rgb()`, `hsl()` or `oklch()` value in a component.
- **Never** use a Tailwind default colour utility — no `bg-blue-500`, no
  `text-gray-600`. Those bypass the token system entirely and will not respond to
  theme changes.
- **Never** invent a spacing or radius value. Use the scale.
- To change how something looks, edit `theme.css`. Not the component.
- If a role you need doesn't exist in `theme.css` — stop and ask. Do not
  improvise one, and do not reach past the bridge to a primitive.

The reason `src/components/ui/` stays unmodified is that shadcn components only
ever refer to role names. That keeps them byte-identical to upstream, so
`npx shadcn@latest add` never conflicts with our design decisions.

### Status tokens

`confirmed`, `pending`, `cancelled` and `in-progress` are **first-class semantic
tokens**, not aliases of `success` / `warning` / `destructive`.

A cancelled booking and a form validation error are different things that happen
to both be red today. They will not stay the same colour, and collapsing them now
means untangling them across every booking surface later.

These exist in `theme.css` now, in both themes: each is a solid chip surface with
a matching `-foreground`, so `bg-confirmed` / `text-confirmed-foreground`,
`bg-in-progress`, and so on. All eight pairings are in the contrast matrix, plus
each fill against the page background at 3:1 — a chip has to be findable as an
object, not only legible once found.

`cancelled` and `destructive` both point at `danger-600` today. That is the
duplication working as designed, not a mistake to tidy up.

## Component scope

There are roughly 60 screens in the design. **This is a component problem, not a
screen problem.** Building 60 screens is the failure mode.

(That count lives in Figma. `docs/design-brief.md` is still a stub — audience,
principles and out-of-scope are all unfilled — so don't go looking for the screen
inventory in the repo.)

Every booking type — flight, hotel, restaurant, rideshare, event — shares one
polymorphic structure:

```
time · place · confirmation · status · cost · actions
```

Build that as **one shared contract with per-type variant configs**. Not five
similar components. The target is roughly six components and five layout
archetypes covering the whole app.

**If you are about to build a component that is 80% the same as an existing one,
stop and propose generalising instead.** This applies even when generalising
looks like more work in the moment.

## Accessibility

Target: **WCAG 2.2 AA**. This is enforced at the token layer and verified by
tests — it is a continuous practice, not a pre-launch audit.

- Contrast is asserted in `src/tokens/tokens.test.ts`, in both light and dark.
- Real-browser axe scans run in the Playwright suite.
- **Any new colour role must be added to the contrast matrix.** A role that isn't
  tested isn't compliant.
- Test each foreground against **the surface it actually sits on**, not just the
  page background. This has already caught one real bug: `muted-foreground`
  passed on white at 4.88:1 and failed on `--muted` at 4.20:1.
- Focus indicators must be visible and offset (2.4.11, 2.4.13). The baseline is
  global in `theme.css` — a 3px outline at 2px offset — so don't add a competing
  one in our own components. The vendored shadcn primitives *do* ship their own
  `focus-visible:` ring on top of it. That's upstream's, it layers with the
  outline rather than replacing it, and it stays, because `ui/` stays unmodified.
- Touch targets: 24×24 CSS px minimum (2.5.8), tokenised as `--size-target-min`;
  prefer 44×44 (`--size-target-comfortable`) for anything used one-handed on a
  phone. **The shadcn button does not meet that preference on its own** — the
  base-nova default is 32px tall, and `xs` / `icon-xs` are exactly 24px, the bare
  floor. Size anything thumb-operated explicitly instead of trusting the default.
- Interactive components need keyboard operation and correct focus management,
  not just correct visuals.

## Project structure

```
src/tokens/         generated primitives + contrast tests — never hand-edit
src/styles/         theme.css, the bridge layer
src/components/ui/  shadcn primitives, vendored, unmodified
src/components/app/ our domain components — the booking contract lives here
src/layouts/        the layout archetypes
src/routes/         page-level screens
src/lib/api/        typed API layer, Zod schemas
src/mocks/          mock data, swappable for real endpoints
docs/               design brief, user flows, interaction spec, API contract
```

## Data layer

Screens are built against mock data behind a **typed API layer** from the start.
Zod schemas define the shapes, TanStack Query handles fetching, mocks live in one
swappable module.

**None of this is built yet.** `src/lib/api/` and `src/mocks/` hold only their
READMEs, and the `src/lib/api/schemas/` path that `docs/api-contract.md` calls
authoritative does not exist. What follows is how to build it, not a description
of what's there — the first screen that needs data is the one that creates it.

Components must never import from `src/mocks/` directly. They go through
`src/lib/api/`. The point is that the backend team can swap in real endpoints
without touching the frontend.

**Maintain `docs/api-contract.md` as you build.** For each screen: endpoint,
request shape, response shape, auth requirement, error cases, empty states. Write
it continuously — reconstructing it at the end is far more work and less accurate.

## Commands

```bash
npm run dev        # dev server
npm run check      # lint + typecheck + unit tests
npm run test:e2e   # Playwright + axe, real browser
npm run build      # production build
```

Run `npm run check` before proposing any commit. Run `npm run test:e2e` before
merging anything that changes markup, focus behaviour or colour.

`test:e2e` is currently **8 of 9**. `[mobile-safari] the first Tab reaches the
skip link` fails because WebKit doesn't Tab to links unless Full Keyboard Access
is switched on — a known, pre-existing environment gap, not a regression. If that
is the only red test, you didn't break anything. Anything else red, you did.

## Working practice

- **Small commits.** The app should work at every commit. This is what makes a
  bad afternoon cost an hour instead of a week.
- **One thing at a time.** Don't build a whole flow in one pass — build one
  component or one screen, verify, commit, move on. The failure mode isn't bad
  code, it's code that can't be reviewed.
- **Don't add dependencies without asking.** Every package is a maintenance
  obligation for a solo maintainer.
- **Prefer editing an existing file over creating a new one.**
- When something is ambiguous, ask. A thirty-second question beats a day of
  rework.
