import type { Material } from '../types';

const DB_NAME = 'pfm-materials';
const DB_VERSION = 1;
const STORE_NAME = 'materials';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('collectionId', 'collectionId', { unique: false });
      }
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open materials database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });

  return dbPromise;
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export async function listByCollection(collectionId: number): Promise<Material[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('collectionId');
  return runRequest(index.getAll(IDBKeyRange.only(collectionId))) as Promise<Material[]>;
}

export async function get(id: string): Promise<Material | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return runRequest(store.get(id)) as Promise<Material | undefined>;
}

export async function create(material: Material): Promise<Material> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await runRequest(store.add(material));
  return material;
}

export async function update(material: Material): Promise<Material> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await runRequest(store.put(material));
  return material;
}

export async function remove(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await runRequest(store.delete(id));
}
