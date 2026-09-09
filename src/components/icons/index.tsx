import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * The icon set, exported from Figma.
 *
 * These are Material Symbols — the same glyphs the design file uses — copied
 * here as their exact path data rather than pulled from an icon package.
 * Three reasons:
 *
 *   1. They match the design byte for byte, including the ones that are not
 *      stock Material: `Elite` and `LocationOn` carry a champagne-to-copper
 *      gradient, and `Star` a radial highlight. A package would give the
 *      plain glyph and quietly lose the treatment.
 *   2. No new dependency for a dozen paths.
 *   3. Figma's asset URLs expire in about a week, so anything that stayed a
 *      remote `<img src>` would break silently. These are the downloaded
 *      bytes.
 *
 * Everything is `currentColor`, so an icon takes the colour of the text
 * around it and stays inside the token system. The gradient icons are the
 * exception by necessity — a gradient needs two colours — and they name
 * bridge roles rather than literals.
 *
 * SIZING: each keeps the viewBox Figma exported it at (20, 22 or 24), so the
 * geometry is exact. Size them with a class: `className="size-5"`.
 */

type IconProps = React.SVGProps<SVGSVGElement>

function Svg({
  viewBox,
  className,
  children,
  ...props
}: IconProps & { viewBox: string }) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  )
}

/** `menu` — the top-bar drawer. */
export function Menu(props: IconProps) {
  return (
    <Svg viewBox="0 0 22 22" {...props}>
      <path fill="currentColor" d="M3.66667 16.5C3.40694 16.5 3.18924 16.4122 3.01354 16.2365C2.83785 16.0608 2.75 15.8431 2.75 15.5833C2.75 15.3236 2.83785 15.1059 3.01354 14.9302C3.18924 14.7545 3.40694 14.6667 3.66667 14.6667H18.3333C18.5931 14.6667 18.8108 14.7545 18.9865 14.9302C19.1622 15.1059 19.25 15.3236 19.25 15.5833C19.25 15.8431 19.1622 16.0608 18.9865 16.2365C18.8108 16.4122 18.5931 16.5 18.3333 16.5H3.66667ZM3.66667 11.9167C3.40694 11.9167 3.18924 11.8288 3.01354 11.6531C2.83785 11.4774 2.75 11.2597 2.75 11C2.75 10.7403 2.83785 10.5226 3.01354 10.3469C3.18924 10.1712 3.40694 10.0833 3.66667 10.0833H18.3333C18.5931 10.0833 18.8108 10.1712 18.9865 10.3469C19.1622 10.5226 19.25 10.7403 19.25 11C19.25 11.2597 19.1622 11.4774 18.9865 11.6531C18.8108 11.8288 18.5931 11.9167 18.3333 11.9167H3.66667ZM3.66667 7.33333C3.40694 7.33333 3.18924 7.24549 3.01354 7.06979C2.83785 6.8941 2.75 6.67639 2.75 6.41667C2.75 6.15694 2.83785 5.93924 3.01354 5.76354C3.18924 5.58785 3.40694 5.5 3.66667 5.5H18.3333C18.5931 5.5 18.8108 5.58785 18.9865 5.76354C19.1622 5.93924 19.25 6.15694 19.25 6.41667C19.25 6.67639 19.1622 6.8941 18.9865 7.06979C18.8108 7.24549 18.5931 7.33333 18.3333 7.33333H3.66667Z" />
    </Svg>
  )
}

/**
 * `person`, outlined — the Profile tab.
 *
 * Outlined, not filled. Figma's `person` asset is the FILLED glyph, because
 * it was drawn for the top-bar button that no longer exists; a filled person
 * beside four outlined tab icons reads as permanently selected. Sourced from
 * the upstream Material set at the same weight as the rest.
 */
export function PersonOutlined(props: IconProps) {
  return (
    <Svg viewBox="0 -960 960 960" {...props}>
      <path fill="currentColor" d="M372-523q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42ZM160-160v-94q0-38 19-65t49-41q67-30 128.5-45T480-420q62 0 123 15.5T731-360q31 14 50 41t19 65v94H160Zm60-60h520v-34q0-16-9.5-30.5T707-306q-64-31-117-42.5T480-360q-57 0-111 11.5T252-306q-14 7-23 21.5t-9 30.5v34Zm324.5-346.5Q570-592 570-631t-25.5-64.5Q519-721 480-721t-64.5 25.5Q390-670 390-631t25.5 64.5Q441-541 480-541t64.5-25.5ZM480-631Zm0 411Z" />
    </Svg>
  )
}

/** `search` — the field in the bottom bar. */
export function Search(props: IconProps) {
  return (
    <Svg viewBox="0 0 22 22" {...props}>
      <path fill="currentColor" d="M8.70833 14.6667C7.04306 14.6667 5.63368 14.0899 4.48021 12.9365C3.32674 11.783 2.75 10.3736 2.75 8.70833C2.75 7.04306 3.32674 5.63368 4.48021 4.48021C5.63368 3.32674 7.04306 2.75 8.70833 2.75C10.3736 2.75 11.783 3.32674 12.9365 4.48021C14.0899 5.63368 14.6667 7.04306 14.6667 8.70833C14.6667 9.38056 14.5597 10.0146 14.3458 10.6104C14.1319 11.2062 13.8417 11.7333 13.475 12.1917L18.6083 17.325C18.7764 17.4931 18.8604 17.7069 18.8604 17.9667C18.8604 18.2264 18.7764 18.4403 18.6083 18.6083C18.4403 18.7764 18.2264 18.8604 17.9667 18.8604C17.7069 18.8604 17.4931 18.7764 17.325 18.6083L12.1917 13.475C11.7333 13.8417 11.2062 14.1319 10.6104 14.3458C10.0146 14.5597 9.38056 14.6667 8.70833 14.6667ZM8.70833 12.8333C9.85417 12.8333 10.8281 12.4323 11.6302 11.6302C12.4323 10.8281 12.8333 9.85417 12.8333 8.70833C12.8333 7.5625 12.4323 6.58854 11.6302 5.78646C10.8281 4.98437 9.85417 4.58333 8.70833 4.58333C7.5625 4.58333 6.58854 4.98437 5.78646 5.78646C4.98437 6.58854 4.58333 7.5625 4.58333 8.70833C4.58333 9.85417 4.98437 10.8281 5.78646 11.6302C6.58854 12.4323 7.5625 12.8333 8.70833 12.8333Z" />
    </Svg>
  )
}

/** `browse` — the Explore tab. */
export function Browse(props: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M3 13V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H11V13H3ZM13 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V9H13V3ZM13 21V11H21V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H13ZM3 15H11V21H5C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V15Z" />
    </Svg>
  )
}

/** `shopping_cart` — the Cart tab. */
export function ShoppingCart(props: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M5.5875 21.4125C5.19583 21.0208 5 20.55 5 20C5 19.45 5.19583 18.9792 5.5875 18.5875C5.97917 18.1958 6.45 18 7 18C7.55 18 8.02083 18.1958 8.4125 18.5875C8.80417 18.9792 9 19.45 9 20C9 20.55 8.80417 21.0208 8.4125 21.4125C8.02083 21.8042 7.55 22 7 22C6.45 22 5.97917 21.8042 5.5875 21.4125ZM15.5875 21.4125C15.1958 21.0208 15 20.55 15 20C15 19.45 15.1958 18.9792 15.5875 18.5875C15.9792 18.1958 16.45 18 17 18C17.55 18 18.0208 18.1958 18.4125 18.5875C18.8042 18.9792 19 19.45 19 20C19 20.55 18.8042 21.0208 18.4125 21.4125C18.0208 21.8042 17.55 22 17 22C16.45 22 15.9792 21.8042 15.5875 21.4125ZM6.15 6L8.55 11H15.55L18.3 6H6.15ZM5.2 4H19.95C20.3333 4 20.625 4.17083 20.825 4.5125C21.025 4.85417 21.0333 5.2 20.85 5.55L17.3 11.95C17.1167 12.2833 16.8708 12.5417 16.5625 12.725C16.2542 12.9083 15.9167 13 15.55 13H8.1L7 15H19V17H7C6.25 17 5.68333 16.6708 5.3 16.0125C4.91667 15.3542 4.9 14.7 5.25 14.05L6.6 11.6L3 4H1V2H4.25L5.2 4Z" />
    </Svg>
  )
}

/** `favorite`, filled — the Library tab, and the SAVED state of the save button. */
export function FavoriteFilled(props: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M12 21L10.55 19.7C8.86667 18.1833 7.475 16.875 6.375 15.775C5.275 14.675 4.4 13.6875 3.75 12.8125C3.1 11.9375 2.64583 11.1333 2.3875 10.4C2.12917 9.66667 2 8.91667 2 8.15C2 6.58333 2.525 5.275 3.575 4.225C4.625 3.175 5.93333 2.65 7.5 2.65C8.36667 2.65 9.19167 2.83333 9.975 3.2C10.7583 3.56667 11.4333 4.08333 12 4.75C12.5667 4.08333 13.2417 3.56667 14.025 3.2C14.8083 2.83333 15.6333 2.65 16.5 2.65C18.0667 2.65 19.375 3.175 20.425 4.225C21.475 5.275 22 6.58333 22 8.15C22 8.91667 21.8708 9.66667 21.6125 10.4C21.3542 11.1333 20.9 11.9375 20.25 12.8125C19.6 13.6875 18.725 14.675 17.625 15.775C16.525 16.875 15.1333 18.1833 13.45 19.7L12 21ZM12 18.3C13.6 16.8667 14.9167 15.6375 15.95 14.6125C16.9833 13.5875 17.8 12.6958 18.4 11.9375C19 11.1792 19.4167 10.5042 19.65 9.9125C19.8833 9.32083 20 8.73333 20 8.15C20 7.15 19.6667 6.31667 19 5.65C18.3333 4.98333 17.5 4.65 16.5 4.65C15.7167 4.65 14.9917 4.87083 14.325 5.3125C13.6583 5.75417 13.2 6.31667 12.95 7H11.05C10.8 6.31667 10.3417 5.75417 9.675 5.3125C9.00833 4.87083 8.28333 4.65 7.5 4.65C6.5 4.65 5.66667 4.98333 5 5.65C4.33333 6.31667 4 7.15 4 8.15C4 8.73333 4.11667 9.32083 4.35 9.9125C4.58333 10.5042 5 11.1792 5.6 11.9375C6.2 12.6958 7.01667 13.5875 8.05 14.6125C9.08333 15.6375 10.4 16.8667 12 18.3Z" />
    </Svg>
  )
}

/** `arrow_forward_ios` — the chevron beside a section heading. */
export function ArrowForwardIos(props: IconProps) {
  return (
    <Svg viewBox="0 0 22 22" {...props}>
      <path fill="currentColor" d="M12.8542 10.5L6.32408 3.96962C6.04297 3.68866 5.9041 3.35057 5.90746 2.95533C5.91082 2.5601 6.05298 2.222 6.33394 1.94104C6.6149 1.66008 6.95513 1.5196 7.35465 1.5196C7.75431 1.5196 8.09463 1.66008 8.37558 1.94104L15.2167 8.77914C15.4605 9.02298 15.6412 9.29401 15.7586 9.59223C15.8763 9.89045 15.9351 10.193 15.9351 10.5C15.9351 10.8069 15.8763 11.1095 15.7586 11.4077C15.6412 11.7059 15.4605 11.9769 15.2167 12.2208L8.3655 19.0717C8.08454 19.3528 7.74813 19.4896 7.35625 19.4819C6.96438 19.4743 6.62796 19.3299 6.347 19.0488C6.06589 18.7678 5.92533 18.4276 5.92533 18.0281C5.92533 17.6286 6.06589 17.2883 6.347 17.0074L12.8542 10.5Z" />
    </Svg>
  )
}



/**
 * `license` — the glyph on the Elite badge.
 *
 * Champagne to copper, left to right. The gradient is the point: it is what
 * separates Elite from an ordinary badge, so it is reproduced rather than
 * flattened to one colour. `useId` keeps the gradient id unique when several
 * Elite cards render at once — duplicate ids in one document silently make
 * every instance use the first one.
 */
export function Elite(props: IconProps) {
  const id = useId()
  return (
    <Svg viewBox="0 0 20 20" {...props}>
      <defs>
        <linearGradient id={id} x1="16.6666" y1="10.4583" x2="3.33325" y2="10.4583" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--emphasis)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M8.22909 10.1458C7.74297 9.65971 7.49992 9.06943 7.49992 8.37499C7.49992 7.68054 7.74297 7.09027 8.22909 6.60416C8.7152 6.11804 9.30547 5.87499 9.99992 5.87499C10.6944 5.87499 11.2846 6.11804 11.7708 6.60416C12.2569 7.09027 12.4999 7.68054 12.4999 8.37499C12.4999 9.06943 12.2569 9.65971 11.7708 10.1458C11.2846 10.6319 10.6944 10.875 9.99992 10.875C9.30547 10.875 8.7152 10.6319 8.22909 10.1458ZM4.99992 19.2083V12.7708C4.47214 12.1875 4.06242 11.5208 3.77075 10.7708C3.47909 10.0208 3.33325 9.22221 3.33325 8.37499C3.33325 6.51388 3.97909 4.93749 5.27075 3.64582C6.56242 2.35416 8.13881 1.70832 9.99992 1.70832C11.861 1.70832 13.4374 2.35416 14.7291 3.64582C16.0208 4.93749 16.6666 6.51388 16.6666 8.37499C16.6666 9.22221 16.5208 10.0208 16.2291 10.7708C15.9374 11.5208 15.5277 12.1875 14.9999 12.7708V19.2083L9.99992 17.5417L4.99992 19.2083ZM13.5416 11.9167C14.5138 10.9444 14.9999 9.76388 14.9999 8.37499C14.9999 6.9861 14.5138 5.80554 13.5416 4.83332C12.5694 3.8611 11.3888 3.37499 9.99992 3.37499C8.61103 3.37499 7.43047 3.8611 6.45825 4.83332C5.48603 5.80554 4.99992 6.9861 4.99992 8.37499C4.99992 9.76388 5.48603 10.9444 6.45825 11.9167C7.43047 12.8889 8.61103 13.375 9.99992 13.375C11.3888 13.375 12.5694 12.8889 13.5416 11.9167Z" />
    </Svg>
  )
}

/** `location_on` — the "near me" button beside search. Same gradient. */
export function LocationOn(props: IconProps) {
  const id = useId()
  return (
    <Svg viewBox="0 0 22 22" {...props}>
      <defs>
        <linearGradient id={id} x1="18.3333" y1="11" x2="3.66667" y2="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--emphasis)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M12.2948 10.4615C12.6538 10.1024 12.8333 9.67083 12.8333 9.16667C12.8333 8.6625 12.6538 8.2309 12.2948 7.87188C11.9358 7.51285 11.5042 7.33333 11 7.33333C10.4958 7.33333 10.0642 7.51285 9.70521 7.87188C9.34618 8.2309 9.16667 8.6625 9.16667 9.16667C9.16667 9.67083 9.34618 10.1024 9.70521 10.4615C10.0642 10.8205 10.4958 11 11 11C11.5042 11 11.9358 10.8205 12.2948 10.4615ZM11 20.1667C8.54028 18.0736 6.70313 16.1295 5.48854 14.3344C4.27396 12.5392 3.66667 10.8778 3.66667 9.35C3.66667 7.05833 4.40382 5.23264 5.87813 3.87292C7.35243 2.51319 9.05972 1.83333 11 1.83333C12.9403 1.83333 14.6476 2.51319 16.1219 3.87292C17.5962 5.23264 18.3333 7.05833 18.3333 9.35C18.3333 10.8778 17.726 12.5392 16.5115 14.3344C15.2969 16.1295 13.4597 18.0736 11 20.1667Z" />
    </Svg>
  )
}

/**
 * `star` — the Concierge tab.
 *
 * Two strokes: the glyph in the current text colour, and a champagne radial
 * highlight over it that fades to nothing. The highlight is decorative and
 * fixed; the base takes the tab's active or inactive colour.
 */
export function Star(props: IconProps) {
  const id = useId()
  return (
    <Svg viewBox="0 0 24 24" {...props}>
      <defs>
        <radialGradient id={id} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12.75 2) rotate(45) scale(13.435 8.3118)">
          <stop stopColor="var(--emphasis)" />
          <stop offset="1" stopColor="var(--emphasis)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path stroke="currentColor" strokeWidth="2" d="M12.0186 3.75488C12.1842 4.21363 12.3841 4.67428 12.6191 5.13574V5.13672L12.623 5.14355C13.1318 6.12321 13.7775 7.05712 14.5547 7.94531C14.5595 7.95081 14.5644 7.95653 14.5693 7.96191C15.3637 8.83014 16.2496 9.61341 17.2246 10.3125L17.2285 10.3154C18.2328 11.0273 19.2636 11.5827 20.3193 11.9727C19.7263 12.1969 19.1301 12.4816 18.5322 12.8262L18.5254 12.8301C17.5867 13.3803 16.7056 14.0219 15.8828 14.7539L15.5342 15.0732C14.7278 15.8161 14.0379 16.6028 13.4717 17.4355L13.2363 17.7969C12.7223 18.6171 12.3152 19.427 12.0225 20.2236C11.7919 19.6044 11.4931 18.9749 11.126 18.3379L10.8164 17.8232C9.9221 16.3787 8.66526 15.0674 7.07715 13.8809C5.96195 13.0386 4.82584 12.3963 3.66992 11.9678C4.75661 11.5702 5.80555 11.0207 6.81445 10.3223L6.81641 10.3203C8.28337 9.29895 9.51562 8.06844 10.5059 6.62988L10.5078 6.62695C11.1566 5.6778 11.6628 4.71984 12.0186 3.75488Z" />
      <path stroke={`url(#${id})`} strokeWidth="2" d="M12.0186 3.75488C12.1842 4.21363 12.3841 4.67428 12.6191 5.13574V5.13672L12.623 5.14355C13.1318 6.12321 13.7775 7.05712 14.5547 7.94531C14.5595 7.95081 14.5644 7.95653 14.5693 7.96191C15.3637 8.83014 16.2496 9.61341 17.2246 10.3125L17.2285 10.3154C18.2328 11.0273 19.2636 11.5827 20.3193 11.9727C19.7263 12.1969 19.1301 12.4816 18.5322 12.8262L18.5254 12.8301C17.5867 13.3803 16.7056 14.0219 15.8828 14.7539L15.5342 15.0732C14.7278 15.8161 14.0379 16.6028 13.4717 17.4355L13.2363 17.7969C12.7223 18.6171 12.3152 19.427 12.0225 20.2236C11.7919 19.6044 11.4931 18.9749 11.126 18.3379L10.8164 17.8232C9.9221 16.3787 8.66526 15.0674 7.07715 13.8809C5.96195 13.0386 4.82584 12.3963 3.66992 11.9678C4.75661 11.5702 5.80555 11.0207 6.81445 10.3223L6.81641 10.3203C8.28337 9.29895 9.51562 8.06844 10.5059 6.62988L10.5078 6.62695C11.1566 5.6778 11.6628 4.71984 12.0186 3.75488Z" />
    </Svg>
  )
}

/* ---------------------------------------------------------------------------
 * Material Symbols that are NOT in the Explore frame.
 *
 * The components that use them — the empty and error states, the budget
 * stepper, the not-built route — have no design yet either. They come from
 * the same Material Symbols set as everything above, at the same weight, so
 * the app has ONE icon family rather than a Figma set plus a package's set
 * that almost matches.
 *
 * Note the viewBox: the upstream set draws on `0 -960 960 960`, not `0 0 24
 * 24`. Normalising the path data would risk introducing an error, so each
 * keeps the box it was drawn in.
 * ------------------------------------------------------------------------ */

/** `add` — increase the group size. */
export function Add(props: IconProps) {
  return (
    <Svg viewBox="0 -960 960 960" {...props}>
      <path fill="currentColor" d="M450-450H200v-60h250v-250h60v250h250v60H510v250h-60v-250Z" />
    </Svg>
  )
}

/** `remove` — decrease the group size. */
export function Remove(props: IconProps) {
  return (
    <Svg viewBox="0 -960 960 960" {...props}>
      <path fill="currentColor" d="M200-450v-60h560v60H200Z" />
    </Svg>
  )
}

/** `error` — the error state. */
export function ErrorIcon(props: IconProps) {
  return (
    <Svg viewBox="0 -960 960 960" {...props}>
      <path fill="currentColor" d="M503.5-289.48q9.5-9.48 9.5-23.5t-9.48-23.52q-9.48-9.5-23.5-9.5t-23.52 9.48q-9.5 9.48-9.5 23.5t9.48 23.52q9.48 9.5 23.5 9.5t23.52-9.48ZM453-433h60v-253h-60v253Zm27.27 353q-82.74 0-155.5-31.5Q252-143 197.5-197.5t-86-127.34Q80-397.68 80-480.5t31.5-155.66Q143-709 197.5-763t127.34-85.5Q397.68-880 480.5-880t155.66 31.5Q709-817 763-763t85.5 127Q880-563 880-480.27q0 82.74-31.5 155.5Q817-252 763-197.68q-54 54.31-127 86Q563-80 480.27-80Zm.23-60Q622-140 721-239.5t99-241Q820-622 721.19-721T480-820q-141 0-240.5 98.81T140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z" />
    </Svg>
  )
}

/** `bookmark` — the empty trips state. */
export function Bookmark(props: IconProps) {
  return (
    <Svg viewBox="0 -960 960 960" {...props}>
      <path fill="currentColor" d="M200-120v-665q0-24 18-42t42-18h440q24 0 42 18t18 42v665L480-240 200-120Zm60-91 220-93 220 93v-574H260v574Zm0-574h440-440Z" />
    </Svg>
  )
}

/** `construction` — a route that has no screen yet. */
export function Construction(props: IconProps) {
  return (
    <Svg viewBox="0 -960 960 960" {...props}>
      <path fill="currentColor" d="M768-120 517-371l57-57 251 251-57 57Zm-581 0-57-57 290-290-107-107-23 23-44-44v85l-24 24-122-122 24-24h86l-48-48 131-131q17-17 37-23t44-6q24 0 44 8.5t37 25.5L348-699l48 48-24 24 104 104 122-122q-8-13-12.5-30t-4.5-36q0-53 38.5-91.5T711-841q15 0 25.5 3t17.5 8l-85 85 75 75 85-85q5 8 8.5 19.5T841-709q0 53-38.5 91.5T711-579q-18 0-31-2.5t-24-7.5L187-120Z" />
    </Svg>
  )
}

/* ---------------------------------------------------------------------------
 * The save heart — two states across three variants, matching the
 * `ButtonSave` component set in Figma (`selected` x `style`).
 *
 *   Button  32px chrome: card surface, hairline, lift shadow. Icon 20px.
 *   Icon    no chrome at all; sits on a photo. Icon 20px, backed.
 *   Nav     48px chrome. Icon 22px, so it is a different drawing, not the
 *           20px one scaled.
 * ------------------------------------------------------------------------ */

/** Unselected, on a chromed button (`style="Button"`). */
export function FavoriteOutline(props: IconProps) {
  return (
    <Svg viewBox="0 0 20 20" {...props}>
      <path stroke="currentColor" d="M13.7495 3.70825C14.9306 3.70825 15.8918 4.09862 16.6675 4.87427C17.4429 5.64981 17.8334 6.61043 17.8335 7.79126C17.8335 8.3727 17.7353 8.94179 17.5386 9.50024C17.3451 10.0493 16.9959 10.6754 16.4731 11.3792C15.9508 12.0823 15.2394 12.8864 14.3335 13.7922C13.4253 14.7004 12.2729 15.7842 10.8745 17.0442L9.99951 17.8274L9.12549 17.0442C7.72692 15.7841 6.57381 14.7005 5.66553 13.7922C4.75959 12.8863 4.04825 12.0823 3.52588 11.3792C3.00308 10.6754 2.65485 10.0493 2.46143 9.50024C2.26469 8.94175 2.1665 8.37273 2.1665 7.79126C2.16658 6.61035 2.55694 5.64984 3.33252 4.87427C4.10809 4.09869 5.0686 3.70832 6.24951 3.70825C6.89854 3.70825 7.51388 3.84503 8.1001 4.11938C8.68717 4.39418 9.1923 4.78089 9.61865 5.28247L9.99951 5.73071L10.3804 5.28247C10.8066 4.78097 11.312 4.39418 11.8989 4.11938C12.4851 3.845 13.1005 3.7083 13.7495 3.70825Z" />
    </Svg>
  )
}

/**
 * Unselected, sitting straight on a photo (`style="Icon"`).
 *
 * Carries a card-coloured backing fill behind the outline — without it the
 * heart vanishes against a light image.
 */
export function FavoriteOutlineOnImage(props: IconProps) {
  return (
    <Svg viewBox="0 0 20 20" {...props}>
      <path fill="var(--card)" d="M9.99984 18.4999L8.7915 17.4166C7.38873 16.1527 6.229 15.0624 5.31234 14.1458C4.39567 13.2291 3.6665 12.4062 3.12484 11.677C2.58317 10.9478 2.2047 10.2777 1.98942 9.66659C1.77414 9.05547 1.6665 8.43047 1.6665 7.79159C1.6665 6.48603 2.104 5.39575 2.979 4.52075C3.854 3.64575 4.94428 3.20825 6.24984 3.20825C6.97206 3.20825 7.65956 3.36103 8.31234 3.66659C8.96511 3.97214 9.52761 4.4027 9.99984 4.95825C10.4721 4.4027 11.0346 3.97214 11.6873 3.66659C12.3401 3.36103 13.0276 3.20825 13.7498 3.20825C15.0554 3.20825 16.1457 3.64575 17.0207 4.52075C17.8957 5.39575 18.3332 6.48603 18.3332 7.79159C18.3332 8.43047 18.2255 9.05547 18.0103 9.66659C17.795 10.2777 17.4165 10.9478 16.8748 11.677C16.3332 12.4062 15.604 13.2291 14.6873 14.1458C13.7707 15.0624 12.6109 16.1527 11.2082 17.4166L9.99984 18.4999Z" />
      <path stroke="currentColor" d="M13.7495 3.70825C14.9306 3.70825 15.8918 4.09862 16.6675 4.87427C17.4429 5.64981 17.8334 6.61043 17.8335 7.79126C17.8335 8.3727 17.7353 8.94179 17.5386 9.50024C17.3451 10.0493 16.9959 10.6754 16.4731 11.3792C15.9508 12.0823 15.2394 12.8864 14.3335 13.7922C13.4253 14.7004 12.2729 15.7842 10.8745 17.0442L9.99951 17.8274L9.12549 17.0442C7.72692 15.7841 6.57381 14.7005 5.66553 13.7922C4.75959 12.8863 4.04825 12.0823 3.52588 11.3792C3.00308 10.6754 2.65485 10.0493 2.46143 9.50024C2.26469 8.94175 2.1665 8.37273 2.1665 7.79126C2.16658 6.61035 2.55694 5.64984 3.33252 4.87427C4.10809 4.09869 5.0686 3.70832 6.24951 3.70825C6.89854 3.70825 7.51388 3.84503 8.1001 4.11938C8.68717 4.39418 9.1923 4.78089 9.61865 5.28247L9.99951 5.73071L10.3804 5.28247C10.8066 4.78097 11.312 4.39418 11.8989 4.11938C12.4851 3.845 13.1005 3.7083 13.7495 3.70825Z" />
    </Svg>
  )
}

/** Unselected at nav size (`style="Nav"`) — a 22px box, not the 20px scaled. */
export function FavoriteOutlineNav(props: IconProps) {
  return (
    <Svg viewBox="0 0 22 22" {...props}>
      <path stroke="currentColor" d="M15.1253 4.02906C16.4367 4.02914 17.5064 4.46297 18.3695 5.32594C19.2326 6.18909 19.6663 7.25944 19.6663 8.57106C19.6663 9.21633 19.5584 9.84803 19.3402 10.4675C19.1252 11.0776 18.7383 11.7701 18.1615 12.5466C17.5849 13.3228 16.8007 14.2092 15.8031 15.2068C14.8031 16.2067 13.5342 17.3994 11.9954 18.7859L10.9993 19.6775L10.0042 18.7859C8.4656 17.3996 7.19745 16.2066 6.19759 15.2068C5.19999 14.2092 4.41575 13.3227 3.83919 12.5466C3.26239 11.7702 2.87547 11.0776 2.66048 10.4675C2.44224 9.84803 2.33337 9.21633 2.33333 8.57106C2.33333 7.25944 2.76706 6.18909 3.63021 5.32594C4.49335 4.46279 5.56371 4.02906 6.87533 4.02906C7.59655 4.02911 8.2805 4.18115 8.93197 4.4861C9.58425 4.79145 10.1459 5.22099 10.6195 5.77809L11.0003 6.22633L11.3812 5.77809C11.8548 5.22095 12.4163 4.79145 13.0687 4.4861C13.7201 4.18122 14.4041 4.02906 15.1253 4.02906Z" />
    </Svg>
  )
}

/**
 * Saved — shared by `style="Button"` and `style="Icon"`.
 *
 * ONE path carrying two gradients: a diagonal rose-to-carnation fill and a
 * vertical highlight-to-shadow stroke. Emphatically not the filled
 * `favorite` glyph — that is the Library tab's icon, and using it here loses
 * the treatment completely.
 */
export function FavoriteSaved(props: IconProps) {
  const id = useId()
  return (
    <Svg viewBox="0 0 20 20" {...props}>
      <defs>
        <linearGradient id={`${id}-f`} x1="5" y1="5" x2="14" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--saved-fill-from)" />
          <stop offset="1" stopColor="var(--saved-fill-to)" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="9.99984" y1="3.20825" x2="9.99984" y2="18.4999" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--saved-edge-from)" />
          <stop offset="1" stopColor="var(--saved-edge-to)" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id}-f)`} stroke={`url(#${id}-s)`} d="M13.7495 3.70825C14.9306 3.70825 15.8918 4.09862 16.6675 4.87427C17.4429 5.64981 17.8334 6.61043 17.8335 7.79126C17.8335 8.3727 17.7353 8.94179 17.5386 9.50024C17.3451 10.0493 16.9959 10.6754 16.4731 11.3792C15.9508 12.0823 15.2394 12.8864 14.3335 13.7922C13.4253 14.7004 12.2729 15.7842 10.8745 17.0442L9.99951 17.8274L9.12549 17.0442C7.72692 15.7841 6.57381 14.7005 5.66553 13.7922C4.75959 12.8863 4.04825 12.0823 3.52588 11.3792C3.00308 10.6754 2.65485 10.0493 2.46143 9.50024C2.26469 8.94175 2.1665 8.37273 2.1665 7.79126C2.16658 6.61035 2.55694 5.64984 3.33252 4.87427C4.10809 4.09869 5.0686 3.70832 6.24951 3.70825C6.89854 3.70825 7.51388 3.84503 8.1001 4.11938C8.68717 4.39418 9.1923 4.78089 9.61865 5.28247L9.99951 5.73071L10.3804 5.28247C10.8066 4.78097 11.312 4.39418 11.8989 4.11938C12.4851 3.845 13.1005 3.7083 13.7495 3.70825Z" />
    </Svg>
  )
}

/**
 * Saved, at nav size.
 *
 * ONE path carrying two gradients: a diagonal rose-to-carnation fill and a
 * vertical highlight-to-shadow stroke. Emphatically not the filled
 * `favorite` glyph — that is the Library tab's icon, and using it here loses
 * the treatment completely.
 */
export function FavoriteSavedNav(props: IconProps) {
  const id = useId()
  return (
    <Svg viewBox="0 0 22 22" {...props}>
      <defs>
        <linearGradient id={`${id}-f`} x1="5.50018" y1="5.49999" x2="15.4002" y2="15.4" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--saved-fill-from)" />
          <stop offset="1" stopColor="var(--saved-fill-to)" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="11" y1="3.52906" x2="11" y2="20.3499" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--saved-edge-from)" />
          <stop offset="1" stopColor="var(--saved-edge-to)" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id}-f)`} stroke={`url(#${id}-s)`} d="M15.1253 4.02906C16.4367 4.02914 17.5064 4.46297 18.3695 5.32594C19.2326 6.18909 19.6663 7.25944 19.6663 8.57106C19.6663 9.21633 19.5584 9.84803 19.3402 10.4675C19.1252 11.0776 18.7383 11.7701 18.1615 12.5466C17.5849 13.3228 16.8007 14.2092 15.8031 15.2068C14.8031 16.2067 13.5342 17.3994 11.9954 18.7859L10.9993 19.6775L10.0042 18.7859C8.4656 17.3996 7.19745 16.2066 6.19759 15.2068C5.19999 14.2092 4.41575 13.3227 3.83919 12.5466C3.26239 11.7702 2.87547 11.0776 2.66048 10.4675C2.44224 9.84803 2.33337 9.21633 2.33333 8.57106C2.33333 7.25944 2.76706 6.18909 3.63021 5.32594C4.49335 4.46279 5.56371 4.02906 6.87533 4.02906C7.59655 4.02911 8.2805 4.18115 8.93197 4.4861C9.58425 4.79145 10.1459 5.22099 10.6195 5.77809L11.0003 6.22633L11.3812 5.77809C11.8548 5.22095 12.4163 4.79145 13.0687 4.4861C13.7201 4.18122 14.4041 4.02906 15.1253 4.02906Z" />
    </Svg>
  )
}
