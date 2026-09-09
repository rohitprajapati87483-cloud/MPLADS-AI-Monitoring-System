import { useEffect, useSyncExternalStore } from 'react';
import type { ParsedDataset } from '@/types/dataset';

let currentDataset: ParsedDataset | null = null;
let hydrated = false;
const listeners = new Set<() => void>();
const DB_NAME = 'mplads-monitor';
const STORE = 'datasets';
const ACTIVE = 'active';
const DATASET_PREFIX = 'dataset:';

function notify() { listeners.forEach(listener => listener()); }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB is not supported by this browser.'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open local dataset storage.'));
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

export function setCurrentDataset(dataset: ParsedDataset | null): void {
  currentDataset = dataset;
  hydrated = true;
  notify();
  if (dataset) {
    void idbPut(ACTIVE, dataset).catch(() => undefined);
    void idbPut(DATASET_PREFIX + dataset.id, dataset).catch(() => undefined);
  } else {
    void idbDelete(ACTIVE).catch(() => undefined);
  }
}

export async function persistDataset(dataset: ParsedDataset): Promise<void> {
  await idbPut(DATASET_PREFIX + dataset.id, dataset);
  await idbPut(ACTIVE, dataset);
  currentDataset = dataset;
  hydrated = true;
  notify();
}

export async function loadPersistedDataset(id: string): Promise<ParsedDataset | null> {
  try { return await idbGet<ParsedDataset>(DATASET_PREFIX + id); } catch { return null; }
}

export async function deletePersistedDataset(id: string): Promise<void> {
  try { await idbDelete(DATASET_PREFIX + id); } catch { /* best effort */ }
  if (currentDataset?.id === id) await clearPersistedDataset();
}

export function getCurrentDataset(): ParsedDataset | null { return currentDataset; }
export function subscribeDataset(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function useCurrentDataset(): ParsedDataset | null { return useSyncExternalStore(subscribeDataset, getCurrentDataset, getCurrentDataset); }
export function isDatasetHydrated() { return hydrated; }

export async function hydrateDatasetStore(): Promise<ParsedDataset | null> {
  if (hydrated) return currentDataset;
  try {
    const saved = await idbGet<ParsedDataset>(ACTIVE);
    currentDataset = saved;
  } catch {
    currentDataset = null;
  } finally {
    hydrated = true;
    notify();
  }
  return currentDataset;
}

export async function clearPersistedDataset(): Promise<void> {
  currentDataset = null;
  hydrated = true;
  try { await idbDelete(ACTIVE); } catch { /* best effort */ }
  notify();
}
