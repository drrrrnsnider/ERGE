import type { Money } from '@/lib/api/schemas/experience'

/**
 * Money arrives as minor units plus an ISO 4217 code and is never a float.
 * This is the one place it becomes a string for display.
 *
 * Whole amounts drop the cents ("$45", not "$45.00") because that is how the
 * design writes prices; anything with cents keeps them. Locale is the
 * device's, so a visitor in Germany sees "45 $" rather than "$45" — currency
 * placement is a locale convention, not ours to fix.
 */
export function formatMoney(
  { amount, currency }: Money,
  locale: string = navigator.language,
): string {
  const major = amount / 100
  const whole = Number.isInteger(major)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major)
}
