/// <reference lib="webworker" />
const worker = self as unknown as ServiceWorkerGlobalScope & { __WB_MANIFEST?: string[] };

const CACHE = 'vku-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

worker.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...SHELL, ...(worker.__WB_MANIFEST || [])])).then(() => worker.skipWaiting()));
});
worker.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vku-shell-') && key !== CACHE).map(key => caches.delete(key)))),
    worker.clients.claim()
  ]));
});
worker.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== worker.location.origin) return;
  event.respondWith(caches.match(request, { ignoreVary: true }).then(cached => cached || fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      void caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});
worker.addEventListener('sync', event => {
  const syncEvent = event as ExtendableEvent & { tag: string };
  if (syncEvent.tag === 'vku-survey-sync') {
    syncEvent.waitUntil(syncInWorker());
  }
});

// Background Sync runs even when every app window is closed. It shares the
// database schema with store.ts and only changes records after a 2xx response.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vku-field-inspection', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function getAll<T>(store: IDBObjectStore | IDBIndex, key?: IDBValidKey): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll(key);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}
function getValue<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}
function putValue(store: IDBObjectStore, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
async function syncInWorker() {
  const db = await openDatabase();
  try {
    const endpoint = await getValue<string>(db.transaction('settings').objectStore('settings'), 'endpoint');
    if (!endpoint) return;
    type Queued = { id: string; createdAt: string; updatedAt: string; status: string; lastError?: string };
    const queue = await getAll<Queued>(db.transaction('surveys').objectStore('surveys').index('by-status'), 'PENDING_SYNC');
    queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const survey of queue) {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': survey.id }, body: JSON.stringify(survey) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const current = await getValue<Queued>(db.transaction('surveys').objectStore('surveys'), survey.id);
      if (current?.status === 'PENDING_SYNC' && current.updatedAt === survey.updatedAt) {
        await putValue(db.transaction('surveys', 'readwrite').objectStore('surveys'), { ...current, status: 'SYNCED', lastError: undefined });
      }
    }
    const clients = await worker.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(client => client.postMessage({ type: 'SYNC_NOW' }));
  } finally { db.close(); }
}
