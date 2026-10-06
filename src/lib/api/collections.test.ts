import { beforeEach, describe, expect, it } from 'vitest'
import { setStore, type Store } from '@/lib/storage'
import {
  deleteCollectionItem,
  getActiveCollection,
  getCollection,
  listCollections,
  putCollectionItem,
} from './collections'
import { getExperiencesByIds } from './experiences'

/**
 * Saved, through the API layer and the mock behind it. The mock is the one
 * that remembers, so what is worth testing is what only shows up over time:
 * a save surviving a "reload", the same save twice, Undo putting something
 * back where it was, and two taps landing at once.
 */

/** `latency` makes each call take real time, as a bridge to native storage
 * does. Without it every read and write finishes before the next request's
 * timer fires, and a race between two requests can never happen. */
function fakeStore(seed: Record<string, string> = {}, latency = 0) {
  const map = new Map(Object.entries(seed))
  const wait = () => new Promise((r) => setTimeout(r, latency))
  const store: Store = {
    get: async (key) => (await wait(), map.get(key) ?? null),
    set: async (key, value) => (await wait(), void map.set(key, value)),
    remove: async (key) => void map.delete(key),
  }
  return { store, map }
}

const ids = async () =>
  (await getActiveCollection('saved')).items.map((i) => i.experienceId)

let collectionId: string

beforeEach(async () => {
  setStore(fakeStore().store)
  collectionId = (await getActiveCollection('saved')).collectionId
})

describe('the saved collection', () => {
  it('starts empty', async () => {
    await expect(ids()).resolves.toEqual([])
  })

  it('remembers a save on the next read — what a reload does', async () => {
    await putCollectionItem(collectionId, { experienceId: 'exp-sunset-sail' })
    await expect(ids()).resolves.toEqual(['exp-sunset-sail'])
  })

  it('lists newest first', async () => {
    await putCollectionItem(collectionId, { experienceId: 'a', addedAt: '2026-10-01T10:00:00Z' })
    await putCollectionItem(collectionId, { experienceId: 'b', addedAt: '2026-10-03T10:00:00Z' })
    await putCollectionItem(collectionId, { experienceId: 'c', addedAt: '2026-10-02T10:00:00Z' })
    await expect(ids()).resolves.toEqual(['b', 'c', 'a'])
  })

  it('treats saving twice as saving once, without moving it', async () => {
    await putCollectionItem(collectionId, { experienceId: 'a', addedAt: '2026-10-01T10:00:00Z' })
    await putCollectionItem(collectionId, { experienceId: 'b', addedAt: '2026-10-02T10:00:00Z' })
    await putCollectionItem(collectionId, { experienceId: 'a' })
    await expect(ids()).resolves.toEqual(['b', 'a'])
  })

  it('puts a restored item back where it was, not at the top', async () => {
    for (const [id, day] of [['a', '01'], ['b', '02'], ['c', '03']] as const) {
      await putCollectionItem(collectionId, { experienceId: id, addedAt: `2026-10-${day}T10:00:00Z` })
    }
    const removed = (await getActiveCollection('saved')).items.find(
      (i) => i.experienceId === 'b',
    )
    await deleteCollectionItem(collectionId, 'b')
    await expect(ids()).resolves.toEqual(['c', 'a'])

    await putCollectionItem(collectionId, removed!)
    await expect(ids()).resolves.toEqual(['c', 'b', 'a'])
  })

  it('loses neither of two saves sent at once', async () => {
    setStore(fakeStore({}, 20).store)
    await Promise.all([
      putCollectionItem(collectionId, { experienceId: 'a' }),
      putCollectionItem(collectionId, { experienceId: 'b' }),
    ])
    await expect(ids()).resolves.toHaveLength(2)
  })

  it('does not mind removing something that is not there', async () => {
    await expect(deleteCollectionItem(collectionId, 'nope')).resolves.toMatchObject({
      items: [],
    })
  })

  it('starts empty again rather than failing on a value it cannot read', async () => {
    setStore(fakeStore({ 'erge.mock.saved.v1': '{"items":"not a list"}' }).store)
    await expect(ids()).resolves.toEqual([])
  })

  it('rejects a collection id it does not know', async () => {
    await expect(
      putCollectionItem('someone-elses', { experienceId: 'a' }),
    ).rejects.toMatchObject({ detail: { code: 'not_found' } })
  })
})

describe('the list of wishlists', () => {
  const wishlist = (id: string, items: [string, string][]) => ({
    collectionId: id,
    kind: 'wishlist',
    active: true,
    name: id,
    items: items.map(([experienceId, day]) => ({
      experienceId,
      addedAt: `2026-10-0${day}T10:00:00.000Z`,
    })),
  })

  it('is empty on a first run', async () => {
    await expect(listCollections('wishlist')).resolves.toEqual({ items: [] })
  })

  it('counts each, and covers it with the newest experience that has a picture', async () => {
    setStore(
      fakeStore({
        /* Saved too: a wishlist only shows what is saved. */
        'erge.mock.saved.v1': JSON.stringify({
          collectionId: 'saved-this-device',
          kind: 'saved',
          active: true,
          items: ['exp-rooftop-picnic', 'exp-tasting-menu', 'exp-ride-to-dinner'].map(
            (experienceId) => ({ experienceId, addedAt: '2026-09-01T10:00:00.000Z' }),
          ),
        }),
        'erge.mock.wishlists.v1': JSON.stringify([
          /* The two newest — Ride to Dinner and the tasting menu — have no
           * photo at all, so the cover falls through to the picnic. */
          wishlist('a', [
            ['exp-rooftop-picnic', '1'],
            ['exp-tasting-menu', '2'],
            ['exp-ride-to-dinner', '3'],
          ]),
          wishlist('empty', []),
        ]),
      }).store,
    )
    const { items } = await listCollections('wishlist')
    const picnic = (await getExperiencesByIds(['exp-rooftop-picnic'])).items[0]!

    expect(items.map((w) => [w.collectionId, w.itemCount])).toEqual([
      ['a', 3],
      ['empty', 0],
    ])
    expect(picnic.images[0]).toBeDefined()
    expect(items[0]!.cover).toEqual(picnic.images[0])
    expect(items[1]!.cover).toBeUndefined()
  })
})

describe('a wishlist', () => {
  /* A wishlist of two, both saved — the starting point for each rule below. */
  async function seed() {
    const at = (day: string) => `2026-10-0${day}T10:00:00.000Z`
    setStore(
      fakeStore({
        'erge.mock.saved.v1': JSON.stringify({
          collectionId: 'saved-this-device',
          kind: 'saved',
          active: true,
          items: [
            { experienceId: 'a', addedAt: at('1') },
            { experienceId: 'b', addedAt: at('2') },
          ],
        }),
        'erge.mock.wishlists.v1': JSON.stringify([
          {
            collectionId: 'wl',
            kind: 'wishlist',
            active: true,
            name: 'Dinners',
            items: [
              { experienceId: 'a', addedAt: at('3') },
              { experienceId: 'b', addedAt: at('4') },
            ],
          },
        ]),
      }).store,
    )
  }
  const inWishlist = async () =>
    (await getCollection('wl')).items.map((i) => i.experienceId)
  const isSaved = async (id: string) =>
    (await getActiveCollection('saved')).items.some((i) => i.experienceId === id)

  it('opens by id, newest first', async () => {
    await seed()
    await expect(inWishlist()).resolves.toEqual(['b', 'a'])
  })

  it('is not_found for an id that does not exist', async () => {
    await seed()
    await expect(getCollection('nope')).rejects.toMatchObject({
      detail: { code: 'not_found' },
    })
  })

  it('Remove from Wishlist takes it out of the wishlist only — it stays saved', async () => {
    await seed()
    await deleteCollectionItem('wl', 'a')
    await expect(inWishlist()).resolves.toEqual(['b'])
    await expect(isSaved('a')).resolves.toBe(true)
  })

  it('Delete from Library hides it from the wishlist too', async () => {
    await seed()
    await deleteCollectionItem('saved-this-device', 'a')
    await expect(inWishlist()).resolves.toEqual(['b'])
    const [summary] = (await listCollections('wishlist')).items
    expect(summary!.itemCount).toBe(1)
  })

  it('Undo of a delete — saving again — brings it back to the wishlist as well', async () => {
    await seed()
    await deleteCollectionItem('saved-this-device', 'a')
    await putCollectionItem('saved-this-device', { experienceId: 'a' })
    await expect(inWishlist()).resolves.toEqual(['b', 'a'])
  })

  it('anything put into a wishlist is saved too', async () => {
    await seed()
    await putCollectionItem('wl', { experienceId: 'c' })
    await expect(isSaved('c')).resolves.toBe(true)
    await expect(inWishlist()).resolves.toContain('c')
  })
})
