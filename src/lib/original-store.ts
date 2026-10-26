/**
 * Keeps the untouched originals of photos uploaded in demo mode (live mode stores them in the
 * Supabase bucket). IndexedDB rather than localStorage: originals can be several megabytes.
 * References look like `idb:<key>`.
 */
const DB = 'boutique-originals'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putOriginal(blob: Blob, name: string): Promise<string> {
  const key = `${name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-${Date.now()}`
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return `idb:${key}`
}

export async function getOriginal(ref: string): Promise<Blob | null> {
  if (!ref.startsWith('idb:')) return null
  const db = await open()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(ref.slice(4))
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}
