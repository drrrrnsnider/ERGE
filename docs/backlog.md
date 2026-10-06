# Backlog

Known gaps — things deliberately left unbuilt, or found and not yet fixed. Each
says where its detail lives. Delete an item in the commit that closes it; a
backlog that lists done work is one nobody trusts.

Not here: decisions (CLAUDE.md and the other docs), and anything already owned
by a section of CLAUDE.md — the Capacitor setup task, the booking status
tokens.

## Navigation

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

- **Accounts.** `docs/user-flows.md` §5: saving an experience, creating a
  wishlist and creating a trip all require an account — the first save is
  where sign-up is offered. Confirmed still the rule (Darrin, 2026-10-05).
  Not built: Saved, and the wishlists built after it, work signed out and
  live on this device through the mock in `src/mocks/handlers.ts`. When
  accounts land, a save attempt while signed out prompts sign-up, and
  anything already gathered on the device is claimed by the new account,
  the same claim the anonymous cart makes (`docs/api-contract.md`,
  Anonymous carts), rather than being lost. Nothing above `src/lib/api/`
  should need to change.

- **The dates the search takeover collects are not carried to results.** See
  the header comment in `src/routes/search-results.tsx`.
- **Explore's collage has no name or count.** `CollageItems` carries a
  caption only, so Explore's `Card / Trip LG` shows neither, where the
  component has both. See `src/components/app/trip-card.tsx`.

## Design follow-ups

- **Library has four undesigned states:** the empty Experiences list, the
  empty Wishlists grid, the "*Title* was removed" row with its Undo
  countdown, and the `+` in the Nav Bar, which is left out until it has
  something to make. The first two are composed from existing roles in
  `src/routes/library.tsx`; the copy is placeholder.
- **Wishlist detail has undesigned states and placeholder copy:** the
  empty Wishlist and Purchased views, the two removed-row sentences ("was
  removed from this wishlist", "was deleted from your Library"), the
  "wishlist is gone" state, and what a Purchased row shows once gifting
  exists (today it would reuse the wishlist row, Add to Cart and all).
  All in `src/routes/wishlist.tsx`.
- **Wishlist detail links to unbuilt screens:** Share and Rename on the
  title bar; Add to Cart, Share Experience, Add to… and Build Trip on each
  row. Each reaches the not-built route; the list is in the header comment
  of `src/routes/wishlist.tsx`. Suggested Additions, under the list, is not
  built yet.
- **Figma re-binds on wishlist detail:** the header's eyebrow and title bind
  lowercase `text/muted` and `text/primary`, the retired collection. The
  context menu (230:8766) is Apple's Liquid Glass kit — iOS fills, 17pt
  labels, 34px corners, `Colors/Red` — and is built from ERGE roles instead
  (`src/components/patterns/menu.tsx` has the mapping). An ERGE Menu
  component in Figma, bound to those roles, would bring the file in line.
- **The Library title binds the retired collection.** The Nav Bar's
  "Library" (230:12281) is bound to lowercase `text/primary` (#f0ece4).
  Built as Text/Primary; re-bind in Figma.
- **Library's title bar scrolls away.** The frame's `top bar gradient +
  blur` suggests it stays pinned with the list passing under it. Built in
  flow for now; pin it if a long list shows it is needed.

- **Glyphs for four categories.** Event, transport, lodging and other have no
  icon in the design, so the detail screen shows them no category badge
  rather than an invented one. Needs glyphs in Figma first.
- **The tab bar's top border** is drawn in Surface/Card, which is the same
  colour as Border/Subtle. Check what the Nav Tab Bar binds in Figma and use
  that role.
- **"Rooftop Bars" rail on the results screen.** The results frame
  interleaves a horizontal rail of compact cards between the large ones. Kept
  in backlog by Darrin.
- **Three spots use Tailwind's `text-sm`, not the type scale:** the empty
  state's description and the error state's message
  (`src/components/patterns/empty-state.tsx`, `error-state.tsx`) and the
  budget hint (`src/components/app/budget-range.tsx`). `text-sm` brings its
  own size and a 1.43 line height, so it sits outside both the scale and
  the line-height rule. Move each to the matching scale size — the empty
  state's description is a paragraph, so it also takes `leading-normal`.

## Check on a real phone

- **Dragging the Tab Pill Bar's highlight with a finger.** The drag is
  pointer events with `touch-action: pan-y`, tested in Playwright with a
  mouse only. Confirm on a device, after the Capacitor setup, that a
  sideways drag moves the highlight and an up-or-down swipe still scrolls
  the page. `src/components/patterns/tab-pill-bar.tsx`.

## When the real map arrives

- **Touches above the results sheet.** The empty area over the map belongs
  to the sheet's scroller, so a real map could not be panned there. It will
  need to pass touches through to the map while the sheet's header still
  drags. Not an issue while the map is a non-interactive placeholder.
