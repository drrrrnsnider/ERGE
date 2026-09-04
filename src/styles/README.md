# `src/styles/` — the theme bridge

One file, and it is the most important CSS in the project.

`theme.css` is where generated Figma primitives get their **meaning**. It is the
only layer that says "primary is brand-600" — the tokens don't know, and the
components don't ask.

```
src/tokens/tokens.css   generated, never edited   "brand-600 is #1266d6"
src/styles/theme.css    hand-written, edit freely "primary IS brand-600"   ← you are here
src/components/ui/*     vendored from shadcn      "the button uses primary"
```

Two things follow from that split:

- **Re-skinning is a one-file change.** Change what a role points at, and every
  component using that role follows.
- **shadcn updates never conflict.** Components only ever mention role names, so
  they can stay byte-identical to upstream while looking like our product.

If you want to change how something looks, look here first. Editing a component
to fix a colour is almost always the wrong layer.
