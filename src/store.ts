import { openDB, type DBSchema } from 'idb';

export type Category = 'Phần cứng' | 'Máy chiếu' | 'Điều hòa' | 'Điện' | 'Nội thất';
export type Status = 'DRAFT' | 'PENDING_SYNC' | 'SYNCED';
export interface Survey {
  id: string;
  building: string;
  floor: string;
  room: string;
  category: Category;
  rating: number;
  notes: string;
  photo?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
  status: Status;
  lastError?: string;
}

interface SurveyDB extends DBSchema {
  surveys: { key: string; value: Survey; indexes: { 'by-status': Status; 'by-created': string } };
  settings: { key: string; value: string };
}

const dbPromise = openDB<SurveyDB>('vku-field-inspection', 1, {
  upgrade(db) {
    const store = db.createObjectStore('surveys', { keyPath: 'id' });
    store.createIndex('by-status', 'status');
    store.createIndex('by-created', 'createdAt');
    db.createObjectStore('settings');
  }
});

export async function putSurvey(survey: Survey) { await (await dbPromise).put('surveys', survey); }
export async function getSurvey(id: string) { return (await dbPromise).get('surveys', id); }
export async function allSurveys() { return (await dbPromise).getAllFromIndex('surveys', 'by-created'); }
export async function pendingSurveys() { return (await dbPromise).getAllFromIndex('surveys', 'by-status', 'PENDING_SYNC'); }
export async function deleteSurvey(id: string) { await (await dbPromise).delete('surveys', id); }
export async function getEndpoint(): Promise<string> { return (await (await dbPromise).get('settings', 'endpoint')) ?? import.meta.env.VITE_SURVEY_API_URL ?? ''; }
export async function setEndpoint(value: string) { await (await dbPromise).put('settings', value, 'endpoint'); }
