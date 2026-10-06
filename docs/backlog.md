# Backlog

Known gaps — things deliberately left unbuilt, or found and not yet fixed. Each
says where its detail lives. Delete an item in the commit that closes it; a
backlog that lists done work is one nobody trusts.

Not here: decisions (CLAUDE.md and the other docs), and anything already owned
by a section of CLAUDE.md — the Capacitor setup task, the booking status
tokens.

## Awaiting a decision

- **Line height: Auto for titles and single-line text, 1.5 for paragraphs.**
  Darrin's direction, 2026-10-05; not built. Today the theme sets 1.5
  everywhere, so titles and card lines sit taller than the frames. Proposed:
  a `leading-auto` utility (`line-height: normal`, Figma's "Auto"), made the
  default for every size in the type scale, with running paragraphs opting
  into `leading-normal` (1.5) — the detail description, editorial copy, empty
  and error states. Measured: `normal` gives Figma's exact boxes in Chromium
  and WebKit alike for both self-hosted faces (Outfit 21→26, 14→18, 12→15;
  Ovo 32→36), closer than the existing 1.25 `leading-snug`. App-wide visual
  change: its own commit, with screenshots. Once built, record the rule in
  CLAUDE.md.

## Navigation

- **The tab you started from, not the path.** The tab bar lights a tab by
  path today, which matches the rule while only Explore can open anything.
  Before Library or Cart can open an experience, the starting tab has to
  travel with navigation, stamped into history. Rule: `docs/user-flows.md`,
  Navigation. How: the `TabBar` comment in `src/layouts/root-layout.tsx`.
- **Scroll position carries between experiences.** Opening one detail screen
  from another can land already scrolled down, because `main` keeps its
  scroll across the route change.
- **Unbuilt destinations**, each landing on the not-built route: the
  concierge (`/concierge`, from both flow buttons and the pairings band), the
  location picker (`/search/location`), the photo gallery
  (`/experience/:id/photos`), and the menu (`/menu`). Four of the five tabs
  are plain items. On the detail screen, Reserve Now, its overflow and More
  options do nothing yet.

## Data

- **Saving forgets on navigation.** Explore, the results screen and the
  detail screen each hold `saved` in component state. Needs a saved-items
  store behind `src/lib/api/` — probably the `Collection` shape in
  `docs/api-contract.md`.
- **The dates the search takeover collects are not carried to results.** See
  the header comment in `src/routes/search-results.tsx`.
- **Explore's collage has no name or count.** `CollageItems` carries a
  caption only, so Explore's `Card / Trip LG` shows neither, where the
  component has both. See `src/components/app/trip-card.tsx`.

## Design follow-ups

- **Glyphs for four categories.** Event, transport, lodging and other have no
  icon in the design, so the detail screen shows them no category badge
  rather than an invented one. Needs glyphs in Figma first.
- **The tab bar's top border** is drawn in Surface/Card, which is the same
  colour as Border/Subtle. Check what the Nav Tab Bar binds in Figma and use
  that role.
- **"Rooftop Bars" rail on the results screen.** The results frame
  interleaves a horizontal rail of compact cards between the large ones. Kept
  in backlog by Darrin.

## When the real map arrives

- **Touches above the results sheet.** The empty area over the map belongs
  to the sheet's scroller, so a real map could not be panned there. It will
  need to pass touches through to the map while the sheet's header still
  drags. Not an issue while the map is a non-interactive placeholder.
