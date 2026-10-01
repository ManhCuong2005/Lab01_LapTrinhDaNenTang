import { allSurveys, getEndpoint, pendingSurveys, putSurvey } from './store';
import { Capacitor } from '@capacitor/core';

let running = false;
const listeners = new Set<() => void>();
export function onSyncChange(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
function changed() { listeners.forEach(listener => listener()); }

export async function syncPending(): Promise<void> {
  if (running || !navigator.onLine) return;
  const endpoint = await getEndpoint();
  if (!endpoint) return;
  running = true;
  try {
    // Sort explicitly: an IndexedDB status index does not guarantee submission order.
    const queue = (await pendingSurveys()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const survey of queue) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': survey.id },
          body: JSON.stringify(survey),
          signal: AbortSignal.timeout(20000)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // Do not overwrite a record changed locally while this request was in flight.
        const current = (await allSurveys()).find(item => item.id === survey.id);
        if (current?.status === 'PENDING_SYNC' && current.updatedAt === survey.updatedAt) {
          await putSurvey({ ...current, status: 'SYNCED', lastError: undefined });
        }
        changed();
      } catch (error) {
        await putSurvey({ ...survey, lastError: error instanceof Error ? error.message : String(error) });
        changed();
        break; // Preserve ordering; retry when connectivity returns or user requests it.
      }
    }
  } finally { running = false; }
}

export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
    const registration = await navigator.serviceWorker.getRegistration();
    const sync = (registration as (ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }) | undefined)?.sync;
    if (sync) {
      try { await sync.register('vku-survey-sync'); } catch { /* foreground retry remains available */ }
    }
  }
  void syncPending();
}
