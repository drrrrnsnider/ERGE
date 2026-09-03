# `src/tokens/` — generated design tokens

**Nothing in `tokens.css` is edited by hand. Ever.**

## The pipeline

```
Figma variables  ──export──▶  design/tokens.figma.json  ──transform──▶  src/tokens/tokens.css
                                    (DTCG format)                        (CSS custom properties)
```

The arrow only points one way. There is no path back from CSS to Figma, so a
change made here is a change that exists nowhere else — and it is destroyed the
next time the transform runs. To change a value, change it in Figma and
re-export.

## What lives here

`tokens.css` holds **primitives only**: raw scale values with no meaning
attached. `--color-brand-600` is a hex code. It is not "the button colour".

The question "which value should a primary button use?" is a semantic decision,
and semantic decisions live one layer up, in
[`src/styles/theme.css`](../styles/theme.css). That separation is what lets us
re-skin the app by editing one bridge file, and lets us pull shadcn updates
without conflicts.

`contrast.ts` and `tokens.test.ts` are the enforcement: they read the real CSS
and fail the build if any colour pairing drops below WCAG 2.2 AA. A regenerated
Figma export that breaks contrast breaks the test suite, which is the point.

## Current status

The values in `tokens.css` are **placeholders**, chosen to pass AA so the app is
usable today. Two things are still to be built:

1. the Figma export (`design/tokens.figma.json`)
2. the transform that turns it into `tokens.css`, wired up as `npm run tokens:build`

Until then, treat `tokens.css` as provisional — but still don't hand-edit it, or
the habit will outlive the placeholder.
