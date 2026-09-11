import type { z } from 'zod'

/**
 * Durable key-value storage, behind one swappable seam.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * CLAUDE.md: anything that will need Capacitor goes behind a seam thin
 * enough to swap in one file. This is that file for storage. Today it is
 * `localStorage`; when Capacitor lands it becomes `@capacitor/preferences`,
 * and nothing above this file changes.
 *
 * WHY IT IS ASYNC EVEN THOUGH localStorage IS NOT
 * -----------------------------------------------
 * This is the decision worth understanding, because it looks like
 * unnecessary ceremony right now.
 *
 * `localStorage.getItem()` returns a value immediately. Capacitor's
 * Preferences API does not — it hands back a promise, because on a phone the
 * value comes from native code across a bridge. If this seam were written
 * the synchronous way that `localStorage` allows, then swapping in Capacitor
 * would change the shape of every single call site: every `const x = read()`
 * becomes `const x = await read()`, and every component that assumed it had
 * the value on first render has to grow a loading state. That is not a seam,
 * it is a rewrite with extra steps.
 *
 * Writing it async now means the awkward part is paid once, here, and the
 * swap really is one file. The cost is that a reader has to handle "not
 * loaded yet" — which is honest anyway: on a phone, that moment is real.
 *
 * WHY READS ARE PARSED
 * --------------------
 * Same reason the API layer parses at the edge. What comes back is a string
 * that some earlier version of this app wrote, possibly months ago, possibly
 * with a different shape. It is untrusted input. A stored value that no
 * longer fits its schema is discarded and treated as absent, so a shape
 * change degrades to an empty list rather than crashing a screen.
 */

/** The one interface a backend has to satisfy. Capacitor's fits as-is. */
export interface Store {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

/**
 * In-memory, used when the real one is unavailable.
 *
 * `localStorage` is not always there to be used: Safari in private mode has
 * historically thrown on write, an embedded webview can have site data
 * switched off, and reading it from a cross-origin iframe throws outright.
 * Recents are a convenience, so the right behaviour is to keep working and
 * forget things, never to take a screen down over it.
 */
function memoryStore(): Store {
  const map = new Map<string, string>()
  return {
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => void map.set(key, value),
    remove: async (key) => void map.delete(key),
  }
}

function localStore(): Store {
  return {
    get: async (key) => window.localStorage.getItem(key),
    set: async (key, value) => window.localStorage.setItem(key, value),
    remove: async (key) => window.localStorage.removeItem(key),
  }
}

/** Probe once, with a real write — merely existing does not mean it works. */
function pickStore(): Store {
  try {
    const probe = '__erge_probe__'
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return localStore()
  } catch {
    return memoryStore()
  }
}

let store: Store | undefined

function active(): Store {
  store ??= pickStore()
  return store
}

/** Swap the backend. For tests, and for the day Capacitor arrives. */
export function setStore(next: Store | undefined) {
  store = next
}

/**
 * Read and validate. Returns `null` for absent, unparseable or outdated —
 * a caller cannot tell the three apart and should not need to.
 */
export async function readJSON<T>(
  key: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  let raw: string | null
  try {
    raw = await active().get(key)
  } catch {
    return null
  }
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    /* Not JSON at all. Drop it rather than leaving a value that will fail
     * again on every read for the life of the install. */
    await removeKey(key)
    return null
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    await removeKey(key)
    return null
  }
  return result.data
}

/** Write. Never throws — a full quota must not take a screen down. */
export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await active().set(key, JSON.stringify(value))
  } catch {
    /* Quota exceeded, or storage disabled mid-session. Nothing to do: the
     * value stays absent and the next read reports absent, which is the
     * same as a first run. */
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await active().remove(key)
  } catch {
    /* Same reasoning as writeJSON. */
  }
}
