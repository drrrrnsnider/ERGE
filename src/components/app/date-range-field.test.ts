import { describe, expect, it } from 'vitest'
import { formatRange } from './date-range-field'

/**
 * What the date row says. Pure, so it is worth testing directly — the cases
 * that matter are the ones a person only stumbles into: a half-picked range,
 * a single day, and the "Today" the shortcut promised.
 */

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)

function todayAt(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

describe('formatRange', () => {
  it('is null when nothing is chosen, so the row shows its placeholder', () => {
    expect(formatRange(undefined)).toBeNull()
    expect(formatRange({ from: undefined, to: undefined })).toBeNull()
  })

  /* A range takes two taps, so between them there is a real state with a
   * start and no end. It has to read as something. */
  it('shows the start alone while the range is half picked', () => {
    expect(formatRange({ from: day(2026, 3, 5), to: undefined })).toBe('Mar 5')
  })

  it('shows one date, not a range, when both ends are the same day', () => {
    expect(formatRange({ from: day(2026, 3, 5), to: day(2026, 3, 5) })).toBe('Mar 5')
  })

  it('shows both ends of a real range', () => {
    expect(formatRange({ from: day(2026, 3, 5), to: day(2026, 3, 9) })).toBe(
      'Mar 5 – Mar 9',
    )
  })

  /* The shortcut says "Today", so the row should keep saying "Today" rather
   * than turning into a date — otherwise it reads as the app having done
   * something slightly different from what was asked. */
  it('keeps the word Today after the shortcut is used', () => {
    const today = todayAt()
    expect(formatRange({ from: today, to: today })).toBe('Today')
  })

  it('but not once today is only the START of a longer range', () => {
    const today = todayAt()
    const later = new Date(today)
    later.setDate(later.getDate() + 3)
    expect(formatRange({ from: today, to: later })).toContain('–')
  })
})
