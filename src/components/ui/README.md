# `src/components/ui/` — shadcn primitives

Unstyled, unopinionated building blocks: button, input, dialog, sheet, popover.
These are generic. Nothing here knows what a flight or an itinerary is — that
belongs in [`../app/`](../app/README.md).

## These are vendored, not installed

shadcn/ui is not a dependency. Running

```bash
npx shadcn@latest add dialog
```

**copies source code into this folder**, where it becomes ours to edit. That is
the whole point of shadcn: you own the component, so you can change its markup
and behaviour, not just its theme.

The primitives underneath (focus traps, ARIA wiring, keyboard handling) come
from Radix, which *is* a real dependency.

**Radix is selected by the `style` field in `components.json`, not by a `base`
field.** The CLI fetches each component from `styles/{style}/{name}.json`, and
`new-york-v4` is the Radix-backed registry. There is no `base` key in the
config schema — adding one makes the whole file invalid, because the schema is
strict and rejects unknown keys. The `-b radix` flag exists only for
`shadcn init`, which we do not run here (it would overwrite `src/styles/` and
`src/tokens/`). Plain `npx shadcn@latest add <name>` picks up Radix from
`style` on its own.

## "Retokenized" means we changed the bridge, not these files

shadcn components refer only to **role names** — `bg-primary`,
`text-muted-foreground`, `ring`. Every role name is assigned a value in
[`src/styles/theme.css`](../../styles/theme.css), which points it at a generated
Figma token.

So the components arrive already speaking our design language, and we can keep
them byte-identical to upstream. Prefer fixing colour in the bridge over editing
a component. Reserve edits here for structural changes — different markup,
different behaviour, an accessibility fix.

Anything you do change, note at the top of the file, so the next person running
`shadcn add` knows there's something to preserve.
