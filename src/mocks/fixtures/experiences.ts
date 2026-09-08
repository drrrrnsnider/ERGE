import type { Experience } from '@/lib/api/schemas/experience'

/**
 * Fake but realistic experiences. Awkward on purpose (src/mocks/README.md):
 * a title long enough to wrap, one with no photo, `from` prices, `unknown`
 * availability, a deep-link-only vendor, a price of exactly $100. Tidy mock
 * data produces layouts that only work on tidy data.
 *
 * Every fixture is parsed through ExperienceSchema in a test. A mock that
 * cannot parse is a mock that is lying, and it hides a bug until integration.
 *
 * Money is minor units: 4500 is $45.00.
 */

const MIAMI = {
  lat: 25.7907,
  lng: -80.13,
  address: 'Miami Beach, FL',
  timezone: 'America/New_York',
} as const

const PHOTO = { url: '/placeholder.svg', alt: '' } as const

export const experiences: readonly Experience[] = [
  {
    experienceId: 'exp-rooftop-picnic',
    placeId: 'ChIJ-rooftop',
    title: 'Rooftop Picnic Night',
    category: 'dining',
    vendorId: 'viator',
    accessTier: 'full',
    location: MIAMI,
    images: [{ url: PHOTO.url, alt: 'A blanket and lanterns on a rooftop at dusk' }],
    price: { kind: 'from', base: 4500, currency: 'USD', taxesIncluded: false },
    availability: { status: 'unknown' },
    details: [
      { label: 'Duration', value: '3 hrs' },
      { label: 'Setting', value: 'City views & candlelight' },
    ],
  },
  {
    experienceId: 'exp-sunset-sail',
    placeId: 'ChIJ-sail',
    title: 'Sunset Sail & Wine',
    category: 'tour',
    vendorId: 'viator',
    accessTier: 'full',
    location: MIAMI,
    images: [{ url: PHOTO.url, alt: 'A sailboat against an orange sky' }],
    price: { kind: 'from', base: 8900, currency: 'USD', taxesIncluded: false },
    availability: { status: 'unknown' },
    details: [{ label: 'Duration', value: '3–4 hours' }],
  },
  {
    experienceId: 'exp-tasting-menu',
    placeId: 'ChIJ-tasting',
    // Long enough to wrap and to truncate in a compact card.
    title: 'Seven-Course Chef’s Table Tasting Menu with Wine Pairings at Marisol',
    category: 'dining',
    vendorId: 'opentable',
    accessTier: 'authenticated',
    location: { ...MIAMI, address: 'Wynwood, Miami, FL' },
    images: [], // No photo. A real case; the card must cope.
    price: { kind: 'final', total: 10000, currency: 'USD', taxesIncluded: true },
    availability: { status: 'available', slots: ['2026-09-12T19:30:00-04:00'] },
    details: [
      { label: 'Duration', value: '2.5 hrs' },
      { label: 'Party size', value: '2–6' },
    ],
  },
  {
    experienceId: 'exp-jazz-club',
    placeId: 'ChIJ-jazz',
    title: 'Late Set at the Blue Door',
    category: 'event',
    vendorId: 'todaytix',
    accessTier: 'full',
    location: { ...MIAMI, address: 'Little Havana, Miami, FL' },
    images: [{ url: PHOTO.url, alt: 'A dim stage with a double bass' }],
    price: { kind: 'final', total: 3200, currency: 'USD', taxesIncluded: true },
    availability: { status: 'available' },
    details: [{ label: 'Doors', value: '9:30pm' }],
  },
  {
    experienceId: 'exp-sound-bath',
    title: 'Sound Bath on the Sand',
    category: 'wellness',
    vendorId: 'classpass',
    accessTier: 'full',
    location: MIAMI,
    images: [{ url: PHOTO.url, alt: 'Singing bowls laid out on a beach towel' }],
    price: { kind: 'from', base: 2500, currency: 'USD', taxesIncluded: false },
    availability: { status: 'unavailable' },
    details: [{ label: 'Duration', value: '1 hr' }],
  },
  {
    experienceId: 'exp-ride-to-dinner',
    title: 'Ride to Dinner',
    category: 'transport',
    vendorId: 'uber',
    accessTier: 'deeplink', // Cannot book in-app. Excluded from cart.
    location: MIAMI,
    images: [],
    price: { kind: 'from', base: 1800, currency: 'USD', taxesIncluded: false },
    availability: { status: 'unknown' },
    details: [{ label: 'Vehicle', value: 'UberX' }],
  },
  {
    experienceId: 'exp-bouquet',
    title: 'Show Up with a Bouquet',
    category: 'gift',
    vendorId: 'floristone',
    accessTier: 'full',
    location: MIAMI,
    images: [{ url: PHOTO.url, alt: 'A wrapped bouquet of ranunculus' }],
    price: { kind: 'final', total: 4500, currency: 'USD', taxesIncluded: true },
    availability: { status: 'available' },
    details: [{ label: 'Category', value: 'Flowers & Gifts' }],
  },
  {
    experienceId: 'exp-houseboat',
    title: 'A Night on a Houseboat',
    category: 'lodging',
    vendorId: 'stayco',
    accessTier: 'full',
    location: { ...MIAMI, address: 'Coconut Grove, Miami, FL' },
    images: [{ url: PHOTO.url, alt: 'A houseboat moored at dusk' }],
    price: { kind: 'from', base: 21000, currency: 'USD', taxesIncluded: false },
    availability: { status: 'unknown' },
    details: [{ label: 'Sleeps', value: '2' }],
  },
  {
    experienceId: 'exp-glass-cabin',
    title: 'Glass Cabin in the Keys',
    category: 'lodging',
    vendorId: 'stayco',
    accessTier: 'full',
    location: { lat: 24.66, lng: -81.55, address: 'Marathon, FL', timezone: 'America/New_York' },
    images: [{ url: PHOTO.url, alt: 'A glass-walled cabin among mangroves' }],
    price: { kind: 'from', base: 34000, currency: 'USD', taxesIncluded: false },
    availability: { status: 'unknown' },
    details: [{ label: 'Sleeps', value: '4' }],
  },
  {
    experienceId: 'exp-everglades',
    title: 'Everglades Airboat at Golden Hour',
    category: 'tour',
    vendorId: 'viator',
    accessTier: 'full',
    location: { lat: 25.76, lng: -80.77, address: 'Everglades, FL', timezone: 'America/New_York' },
    images: [{ url: PHOTO.url, alt: 'An airboat cutting through sawgrass' }],
    price: { kind: 'final', total: 7800, currency: 'USD', taxesIncluded: true },
    availability: { status: 'available' },
    details: [
      { label: 'Duration', value: '2 hrs' },
      { label: 'Group', value: 'up to 6' },
    ],
  },
]
