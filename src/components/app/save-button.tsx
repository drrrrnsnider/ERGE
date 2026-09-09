import {
  FavoriteOutline,
  FavoriteOutlineNav,
  FavoriteOutlineOnImage,
  FavoriteSaved,
  FavoriteSavedNav,
} from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * `ButtonSave` — two states across three variants, matching the Figma
 * component set. `selected` x `style`, the same names the design uses.
 *
 *   Button  32px: card surface at 90%, a hairline, a lift shadow. The
 *           default, used on `Card / Media MD`.
 *   Icon    No chrome whatsoever — the glyph sits straight on a photo and
 *           carries its own backing fill and a drop shadow instead. Used on
 *           `Card / Media SM`.
 *   Nav     48px, matching the other circular nav buttons. Its glyph is a
 *           22px drawing rather than the 20px one scaled up, so it is a
 *           separate asset.
 *
 * The saved state is NOT a filled version of the outline. It is its own
 * drawing with two gradients — a diagonal rose-to-carnation fill and a
 * vertical highlight-to-shadow stroke — so the change reads as the heart
 * lighting up rather than a different icon appearing.
 *
 * ACCESSIBILITY. `aria-pressed` is what communicates the state; the colour
 * change alone would not (SC 1.4.1). The label names the thing being acted
 * on, because a screen reader user meeting the twentieth "Save" button on a
 * page has no idea which card it belongs to.
 */
export function SaveButton({
  saved,
  label,
  onToggle,
  style = 'Button',
  className,
}: {
  saved: boolean
  /** What is being saved — becomes part of the accessible name. */
  label: string
  onToggle: () => void
  style?: 'Button' | 'Icon' | 'Nav'
  className?: string
}) {
  const Glyph = saved
    ? style === 'Nav'
      ? FavoriteSavedNav
      : FavoriteSaved
    : style === 'Nav'
      ? FavoriteOutlineNav
      : style === 'Icon'
        ? FavoriteOutlineOnImage
        : FavoriteOutline

  return (
    <button
      type="button"
      data-slot="save-button"
      data-style={style}
      /* 32px, as designed. The coarse-pointer rule would otherwise raise
       * this to 44 and the card would stop matching the design on a phone.
       * Save qualifies for the opt-out: it is secondary to the card's real
       * action, which is opening the experience, and the whole card is the
       * 320x180 target for that. Floored at 32 and asserted there, so it can
       * never quietly shrink to the 24px legal minimum. Not applied to the
       * Nav variant, which is 48px and needs no help. */
      data-target={style === 'Nav' ? undefined : 'compact'}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
      onClick={onToggle}
      className={cn(
        'grid place-items-center rounded-full',
        style === 'Button' &&
          'size-8 border border-border bg-card/90 shadow-lift',
        style === 'Nav' && 'size-12 border border-border bg-card',
        style === 'Icon' && 'drop-shadow-lift-sm',
        className,
      )}
    >
      {/* Unsaved takes the surrounding text colour; saved carries its own
        * gradients and ignores it. */}
      <Glyph
        className={cn(
          style === 'Nav' ? 'size-[22px]' : 'size-5',
          !saved && 'text-primary',
        )}
      />
    </button>
  )
}
