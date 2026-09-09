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
- **Material Symbols** for icons, vendored as path data in
  `src/components/icons/` — not an icon package. The design file's icons ARE
  Material Symbols, so the exported bytes and the upstream set are the same
  family, and several carry gradients a package would flatten. Figma asset
  URLs expire in about a week, so nothing may stay a remote `<img src>`.
- **Outfit and Ovo**, self-hosted from `src/assets/fonts/` — deliberately not
  the Google Fonts CDN. The web build gets wrapped with Capacitor, and an app
  serving from the local filesystem cannot have its typography depend on a
  network request at launch. Outfit is one variable face covering 400-600,
  which measured 47 KB against 141 KB for the six static files Google serves
  for the same three weights. `src/styles/fonts.css` carries the rest of the
  reasoning. Both families are SIL Open Font License and their licences sit
  beside the woff2 files, which the licence requires.
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

`tokens.css` is generated from Figma variables exported as DTCG JSON, one way:
Figma → JSON → CSS. The pipeline is real and wired up:

```bash
npm run tokens         # tokens/figma/*.json  ->  src/tokens/tokens.css
npm run tokens:check    # fails if the committed CSS is stale or hand-edited
```

`tokens:check` runs first in `npm run verify`, so a hand-edit or a forgotten
regeneration fails the build rather than surviving until someone notices. The
error tells you to re-run `npm run tokens`, because editing the CSS is always
the wrong fix — the next export destroys it.

Inputs live in `tokens/figma/`: `Primitives.tokens.json` (the ramps and
scales) and `Dark.tokens.json` (the semantic layer). Both are committed, so
the CSS is reproducible from the repo alone.

**The app is dark-only.** There is one theme — the Figma Dark mode export — and
`<html class="dark">` is hardcoded in `index.html`. It is load-bearing, not a
preference: the vendored base-nova components carry their own `dark:`
utilities, and `theme.css` binds that variant to the class. A Playwright test
fails if it is removed. There is no light theme to fall back to.

### Rules

- **Never** write a hex, `rgb()`, `hsl()` or `oklch()` value in a component.
- **Never** use a Tailwind default colour utility — no `bg-blue-500`, no
  `text-gray-600`. Those bypass the token system entirely and will not respond to
  theme changes.

Both are enforced, not just asked for: `scripts/check-colours.mjs` runs as part
of `npm run lint`, so a raw colour fails the build before typecheck or tests
start. It exempts `src/tokens/tokens.css` (generated — `tokens:check` guards it
instead) and `src/tokens/contrast.ts` (its job is parsing hex), each with the
reason stated in the script. `color-mix(in oklch, var(--a), var(--b))` is
deliberately allowed: there `oklch` names a colour space and the arguments are
real tokens, which is the correct way to derive a colour.

It is a script rather than an oxlint rule because oxlint does not implement
`no-restricted-syntax` and rejects its whole config file on an unknown rule.
If that changes, move the patterns into `.oxlintrc.json` and delete the
script.
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

**They do not exist yet.** They were removed from `theme.css` and the contrast
matrix during the move to the Figma export, because the export has no booking
status semantics — its `Feedback` group is `success` / `warning` / `error` /
`info`, which is a different vocabulary about system state, not about where a
booking has got to.

Do not resurrect them by aliasing onto `Feedback/*`. That is the exact
collapse this section exists to prevent: it would look right for as long as a
cancelled booking and a validation error stay the same colour, and cost a
migration across every booking surface on the day they diverge.

The unblock is four `Status/*` variables in Figma pointing at whichever
primitives are right, then `npm run tokens`. Each needs a fill and a matching
`-foreground`, and both halves go in the contrast matrix, plus each fill
against `Surface/Base` at 3:1 — a chip has to be findable as an object, not
only legible once found.

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

- **The four data states are a system pattern, not per-screen work.**
  `EmptyState`, `Skeleton` and `ErrorState` live in `src/components/patterns/`
  — they are neither vendored primitives nor domain components, so they sit
  beside both rather than inside either. `Input` lives there too: it is ours,
  from the Figma component set, not a vendored shadcn control. Every screen inherits them; build a
  bespoke one only where the generic pattern genuinely fails.
- **States are per-section, not per-page.** Explore fetches each rail
  separately, so one failing renders its own error while the rest of the page
  is fine. A page-level spinner would hide four healthy sections behind one
  slow one. Partial failure is an operating condition, not an error.
- Contrast is asserted in `src/tokens/tokens.test.ts` against the Figma
  semantic tokens themselves, not shadcn's role names — the tokens are where
  the decision lives. Dark only, since there is one theme.
- Real-browser axe scans run in the Playwright suite.
- **Any new colour role must be added to the contrast matrix.** A role that isn't
  tested isn't compliant.
- Test each foreground against **the surface it actually sits on**, not just the
  page background — Base, Card and Elevated. A pairing that clears AA on one
  surface can fail on another. The tightest margin today is `Text/Muted` on
  `Surface/Elevated` at **4.56:1**, six hundredths above the line: darkening
  Elevated breaks it.
- `Text/Disabled` is deliberately exempt. It measures 2.52 / 2.32 / 1.99 and
  WCAG 1.4.3 exempts inactive controls. Do not "fix" it.
- Focus indicators must be visible and offset (2.4.11, 2.4.13). The baseline is
  global in `theme.css` — so don't add a competing one in our own components.
  The vendored shadcn primitives *do* ship their own `focus-visible:` ring on
  top of it. That's upstream's, it layers with the outline rather than
  replacing it, and it stays, because `ui/` stays unmodified.
- The skip link is verified end to end: focusing it reveals it, and
  activating it moves focus to `#main`. `<main>` carries `tabIndex={-1}` for
  that reason — without it the hash changes and the page scrolls but focus
  stays on `<body>`, so the next Tab restarts from the top of the chrome. Any
  future layout archetype needs the same on its main region.
- Two focus indicators coexist, by design. `theme.css` sets a global 3px
  outline at 2px offset, sized from Figma's `Size/Focus Ring` and
  `Size/Focus Offset`. The vendored base-nova components override it — they
  carry `outline-none` and draw their own `focus-visible:ring-*` — and
  utilities outrank `@layer base`, so a button shows their ring and a link
  shows our outline. Don't try to unify them: that would mean editing `ui/`.
- Touch targets: 24×24 CSS px minimum (2.5.8) everywhere, and **44×44 on
  coarse pointers**. `theme.css` raises controls to 44px under
  `@media (pointer: coarse)`, so phones get thumb-sized targets while desktop
  keeps its density — the same button is 44px on a phone and 32px under a
  mouse. Asserted in Playwright rather than tokenised: 24 and 44 are external
  constants, not design decisions. `sr-only` elements are excluded, since the
  skip link is 1×1 until focused.

### `data-target="compact"`

A control opts out of the 44px floor by carrying `data-target="compact"`,
which keeps it at 32px. Three rules:

- **It must be typed into the markup on purpose.** It is never a default and
  is never inferred from a variant name — `size="sm"` opts out of nothing. If
  you cannot see the attribute in the JSX, the control is full size.
- **Secondary, non-critical controls only** — filter chips, segmented
  controls, tag dismiss buttons and similar. **Never** primary actions, form
  fields, or navigation. If the thing is how someone gets somewhere or commits
  to something, it gets the full 44px.
- **More than a handful on one screen is a signal, not a licence.** It means
  the layout is too dense for a phone and wants rethinking, not more opt-outs.

Opting out costs 12px, not a drop to the legal minimum. Playwright asserts
≥44px for everything without the attribute and ≥32px for everything with it,
both as hard tests on the mobile projects, so a compact control that shrinks
below 32px fails the build.
- Interactive components need keyboard operation and correct focus management,
  not just correct visuals.

## Project structure

```
src/tokens/         generated primitives + contrast tests — never hand-edit
src/styles/         theme.css, the bridge layer
src/components/ui/  shadcn primitives, vendored, unmodified
src/components/patterns/  our own primitives — the four data states, form controls
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
npm run dev          # dev server
npm run lint         # oxlint + the no-raw-colour check
npm run tokens       # regenerate src/tokens/tokens.css from the Figma export
npm run tokens:check # fail if that CSS is stale or hand-edited
npm run check        # lint + typecheck + unit tests
npm run test:e2e     # Playwright + axe, real browser
npm run verify       # tokens:check + check + test:e2e — the whole green light
npm run build        # production build
```

Run `npm run check` before proposing any commit, and `npm run verify` before
merging anything that changes markup, focus behaviour, colour or tokens.

Current state: **38 unit tests** and **70 e2e** passing, 2 e2e skipped by
design (the coarse-pointer size assertions do not apply to `desktop-chrome`).
`npm run verify` exits 0. There are no known-failing tests — if something is
red, you broke it.

The skip-link test asserts different things per engine on purpose. WebKit
leaves links out of the Tab sequence unless macOS keyboard navigation is
switched on, so Chromium asserts that the first Tab reaches the link while
WebKit asserts that focusing it reveals it, that it paints on top, and that
activating it moves focus to `#main`. Both are hard assertions. Don't collapse
them into one — the comment in the spec explains what each branch is the only
thing testing.

## Deployment

Vercel, connected to this repo. **Pushing to `main` deploys it.** There is no
staging branch and no review step, so a push is a release — worth knowing
before running one, because nothing else in this file implies that.

None of the deployment configuration lives here. There is no `vercel.json`:
the build command, output directory and Node version are set in Vercel's
dashboard, so someone reading the repo alone cannot see them or reproduce the
build. Moving them into `vercel.json` is the fix if that ever matters.

Deep links survive a hard refresh — `/search?near=me` pasted straight into the
address bar serves the app rather than a 404 — because Vercel's Vite preset
falls back to `index.html` for paths that are not files. That is inherited
from framework detection rather than pinned by us, so re-test it if the preset
or the build output changes. `src/router.tsx` is a single catch-all, so every
path that has no screen yet renders the not-built route instead of erroring.

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
