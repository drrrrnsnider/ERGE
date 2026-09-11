import { beforeEach, describe, expect, it } from 'vitest'
import {
  addRecentSearch,
  addRecentlyViewed,
  getRecentSearches,
  getRecentlyViewed,
} from './recents'
import { setStore, type Store } from './storage'

/**
 * Recents are the first thing in the app that survives a reload, so the parts
 * worth testing are the ones that only show up over time: the list filling
 * past its cap, the same search being run twice, and a stored value written
 * by some earlier version of the app.
 */

/** A Store we can inspect and corrupt, standing in for the device. */
function fakeStore(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed))
  const store: Store = {
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => void map.set(key, value),
    remove: async (key) => void map.delete(key),
  }
  return { store, map }
}

const SEARCHES_KEY = 'erge.recent-searches.v1'

beforeEach(() => {
  setStore(fakeStore().store)
})

describe('recent searches', () => {
  it('starts empty', async () => {
    await expect(getRecentSearches()).resolves.toEqual([])
  })

  it('puts the newest first', async () => {
    await addRecentSearch('Jetski')
    await addRecentSearch('Petit Trois')
    await expect(getRecentSearches()).resolves.toEqual(['Petit Trois', 'Jetski'])
  })

  it('moves a repeated search up instead of duplicating it', async () => {
    await addRecentSearch('Jetski')
    await addRecentSearch('Petit Trois')
    const after = await addRecentSearch('Jetski')
    expect(after).toEqual(['Jetski', 'Petit Trois'])
  })

  it('keeps only the six the takeover can draw', async () => {
    for (const q of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) await addRecentSearch(q)
    const list = await getRecentSearches()
    expect(list).toHaveLength(6)
    expect(list[0]).toBe('g')
    expect(list).not.toContain('a')
  })

  it('trims, and ignores a blank query', async () => {
    await addRecentSearch('  Rose Delivery  ')
    await addRecentSearch('   ')
    await expect(getRecentSearches()).resolves.toEqual(['Rose Delivery'])
  })

  it('survives a reload', async () => {
    const { store, map } = fakeStore()
    setStore(store)
    await addRecentSearch('Date Night')
    // A new session, same device: same bytes, fresh module state.
    setStore(fakeStore(Object.fromEntries(map)).store)
    await expect(getRecentSearches()).resolves.toEqual(['Date Night'])
  })
})

describe('a stored value this version cannot use', () => {
  it('reads as empty rather than throwing', async () => {
    // What an older version might have written: objects, not strings.
    setStore(fakeStore({ [SEARCHES_KEY]: '[{"q":"Jetski"}]' }).store)
    await expect(getRecentSearches()).resolves.toEqual([])
  })

  it('is cleared, so it cannot fail on every read forever', async () => {
    const { store, map } = fakeStore({ [SEARCHES_KEY]: 'not json at all' })
    setStore(store)
    await getRecentSearches()
    expect(map.has(SEARCHES_KEY)).toBe(false)
  })

  it('does not stop a new search being recorded', async () => {
    setStore(fakeStore({ [SEARCHES_KEY]: '{"nope":true}' }).store)
    await expect(addRecentSearch('Jetski')).resolves.toEqual(['Jetski'])
  })
})

describe('storage that refuses to work', () => {
  /* The list still updates for this session — the chip you just searched
   * appears, it simply will not be there next launch. Degrading to "forgets
   * on reload" is right; degrading to "typing does nothing" would not be. */
  it('keeps the screen working and just forgets', async () => {
    const broken: Store = {
      get: async () => {
        throw new Error('site data disabled')
      },
      set: async () => {
        throw new Error('quota exceeded')
      },
      remove: async () => {
        throw new Error('nope')
      },
    }
    setStore(broken)
    await expect(addRecentSearch('Jetski')).resolves.toEqual(['Jetski'])
    // Nothing was persisted, so a later read has no memory of it.
    await expect(getRecentSearches()).resolves.toEqual([])
  })
})

describe('recently viewed', () => {
  it('stores ids, newest first, capped at ten', async () => {
    for (let i = 0; i < 12; i += 1) await addRecentlyViewed(`exp-${i}`)
    const list = await getRecentlyViewed()
    expect(list).toHaveLength(10)
    expect(list[0]).toBe('exp-11')
  })

  it('moves a re-viewed experience to the front', async () => {
    await addRecentlyViewed('exp-a')
    await addRecentlyViewed('exp-b')
    await expect(addRecentlyViewed('exp-a')).resolves.toEqual(['exp-a', 'exp-b'])
  })

  it('is kept separately from searches', async () => {
    await addRecentSearch('Jetski')
    await addRecentlyViewed('exp-a')
    await expect(getRecentSearches()).resolves.toEqual(['Jetski'])
    await expect(getRecentlyViewed()).resolves.toEqual(['exp-a'])
  })
})
