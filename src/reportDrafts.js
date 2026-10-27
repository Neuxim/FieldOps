import { isDemo } from "./api";

// Unfinished reports, kept on this device (IndexedDB) so they survive a closed tab,
// a crashed browser or a flat battery. Photos are stored as Blobs.
// Draft: { key, orderId, orderTitle, values, signature, photos: [{ id, blob, name }], savedAt }

const DB_NAME = "fieldops";
const STORE = "reportDrafts";
// Demo data and real orders can share ids, so their drafts are kept apart
const MODE = isDemo ? "demo" : "live";

let dbPromise;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("Drafts aren't supported in this browser."));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // A failed open (e.g. blocked storage in a private window) can be retried later
  dbPromise.catch(() => {
    dbPromise = undefined;
  });
  return dbPromise;
}

async function run(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const keyFor = (orderId) => `${MODE}:${orderId}`;

export async function saveDraft(order, draft) {
  await run("readwrite", (store) =>
    store.put({
      ...draft,
      key: keyFor(order.id),
      mode: MODE,
      orderId: String(order.id),
      orderTitle: order.title,
      savedAt: Date.now(),
    }),
  );
}

export async function loadDraft(orderId) {
  return (await run("readonly", (store) => store.get(keyFor(orderId)))) ?? null;
}

export async function deleteDraft(orderId) {
  await run("readwrite", (store) => store.delete(keyFor(orderId)));
}

// All drafts of the current mode, newest first
export async function listDrafts() {
  const all = await run("readonly", (store) => store.getAll());
  return all.filter((d) => d.mode === MODE).sort((a, b) => b.savedAt - a.savedAt);
}
