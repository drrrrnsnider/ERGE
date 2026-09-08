import { describe, expect, it } from 'vitest'
import { PriceSchema, priceLowBound } from './experience'

/**
 * The price union is the one place a rendering mistake becomes a trust
 * problem: showing a `from` base as if it were an all-in total is exactly
 * the thing the budget-transparency position rules out. So the shape is
 * asserted, not assumed.
 */
describe('price', () => {
  it('rejects a `from` price that claims taxes are included', () => {
    const result = PriceSchema.safeParse({
      kind: 'from',
      base: 4500,
      currency: 'USD',
      taxesIncluded: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a `final` price carrying a `base` instead of a `total`', () => {
    const result = PriceSchema.safeParse({
      kind: 'final',
      base: 4500,
      currency: 'USD',
      taxesIncluded: true,
    })
    expect(result.success).toBe(false)
  })

  it('filters `from` items at their low bound', () => {
    // api-contract.md: a "from $45" item appears in a $0–$100 search.
    expect(
      priceLowBound({
        kind: 'from',
        base: 4500,
        currency: 'USD',
        taxesIncluded: false,
      }),
    ).toEqual({ amount: 4500, currency: 'USD' })
  })

  it('filters `final` items at their total', () => {
    expect(
      priceLowBound({
        kind: 'final',
        total: 10_000,
        currency: 'USD',
        taxesIncluded: true,
      }),
    ).toEqual({ amount: 10_000, currency: 'USD' })
  })
})
