# Interaction spec

> Stub — fill in as decisions get made.

How things behave, as opposed to how they look. If a behaviour isn't written
down here, it gets invented differently by each person who implements it.

## Every component needs

- **States:** default, hover, focus, active, disabled, loading, error, empty
- **Keyboard:** what Tab reaches, what Enter/Space/Escape/arrows do
- **Announcement:** what a screen reader says, and what it says when the thing
  changes

## Motion

_Durations and easings, sourced from tokens once the Figma export lands._

Respect `prefers-reduced-motion`: movement becomes a fade or nothing at all.
Motion carries meaning here (a card entering the itinerary), so the reduced
variant still has to communicate the change.

## Touch

- Minimum target 24×24px (WCAG 2.2 SC 2.5.8); comfortable default 44×44px
- Both are tokens: `--size-target-min`, `--size-target-comfortable`
- Gestures need a non-gesture equivalent — swipe-to-delete also needs a button

## Focus

- Never removed, only restyled
- 3px ring, 2px offset, ≥3:1 contrast (SC 2.4.11, 2.4.13)
- Dialogs trap focus and return it to the trigger on close
- Route changes move focus to the new screen's heading
