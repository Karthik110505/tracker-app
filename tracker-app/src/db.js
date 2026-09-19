import { apiClient } from './api/client';

const DB_NAME = 'GATERevisionTrackerDB';
const DB_VERSION = 1;
const LAST_SYNC_KEY = 'gate_tracker_last_sync_timestamp';
const PENDING_MUTATIONS_KEY = 'gate_tracker_pending_mutations';

// Helper to open IndexedDB connection
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('tests')) {
        const testStore = db.createObjectStore('tests', { keyPath: 'id' });
        testStore.createIndex('folderId', 'folderId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Queue offline mutations helper
function getPendingMutations() {
  try {
    const raw = localStorage.getItem(PENDING_MUTATIONS_KEY);
    return raw ? JSON.parse(raw) : { folders: [], tests: [] };
  } catch (e) {
    return { folders: [], tests: [] };
  }
}

function queuePendingMutation(type, item) {
  try {
    const pending = getPendingMutations();
    if (type === 'test') {
      // Clean paperHtml before queueing
      const { paperHtml: _paperHtml, ...cleanTest } = item;
      const filtered = pending.tests.filter(t => t.id !== cleanTest.id);
      filtered.push(cleanTest);
      pending.tests = filtered;
    } else if (type === 'folder') {
      const filtered = pending.folders.filter(f => f.id !== item.id);
      filtered.push(item);
      pending.folders = filtered;
    }
    localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(pending));
  } catch (e) {
    console.warn('Failed to queue offline mutation:', e);
  }
}

function clearPendingMutations() {
  localStorage.removeItem(PENDING_MUTATIONS_KEY);
}

export const dbService = {
  // --- CLOUD SYNC & OFFLINE PROTOCOL ---
  async syncWithCloud() {
    if (!apiClient.isAuthenticated()) {
      return { success: false, reason: 'unauthenticated' };
    }

    try {
      console.log('🔄 [SYNC] Initiating sync with MongoDB Atlas backend...');
      const db = await openDB();

      // 1. Push any queued offline mutations
      const pending = getPendingMutations();
      if (pending.folders.length > 0 || pending.tests.length > 0) {
        console.log(`📤 [SYNC] Pushing offline mutations: ${pending.folders.length} folders, ${pending.tests.length} tests...`);
        await apiClient.pushSync(pending.folders, pending.tests);
        clearPendingMutations();
      }

      // 2. Fetch changes from cloud (perform full pull if local tests are empty)
      const currentLocalTests = await this.getAllTests();
      const lastSync = currentLocalTests.length > 0 ? localStorage.getItem(LAST_SYNC_KEY) : null;
      const syncData = await apiClient.fetchSync(lastSync);

      if (syncData && syncData.success) {
        const { folders = [], tests = [], serverTime } = syncData;

        // Apply folder updates
        if (folders.length > 0) {
          const fTx = db.transaction('folders', 'readwrite');
          const fStore = fTx.objectStore('folders');
          for (const folder of folders) {
            if (folder.deletedAt) {
              fStore.delete(folder.id);
            } else {
              fStore.put(folder);
            }
          }
          await new Promise((res) => {
            fTx.oncomplete = () => res();
            fTx.onerror = () => res();
          });
        }

        // Apply test updates while preserving local paperHtml
        if (tests.length > 0) {
          // Pre-fetch local tests to prevent transaction timeout/deactivation on microtasks
          const localTests = await this.getAllTests();
          const localMap = new Map(localTests.map(t => [t.id, t]));

          const tTx = db.transaction('tests', 'readwrite');
          const tStore = tTx.objectStore('tests');

          for (const cloudTest of tests) {
            if (cloudTest.deletedAt) {
              tStore.delete(cloudTest.id);
            } else {
              const existingLocal = localMap.get(cloudTest.id);
              // Merge cloud metadata with local paperHtml
              const merged = {
                ...cloudTest,
                paperHtml: existingLocal?.paperHtml || ''
              };

              tStore.put(merged);
            }
          }
          await new Promise((res) => {
            tTx.oncomplete = () => res();
            tTx.onerror = () => res();
          });
        }

        if (serverTime) {
          localStorage.setItem(LAST_SYNC_KEY, serverTime);
        }

        console.log(`✅ [SYNC] Cloud sync complete. Updated ${folders.length} folders, ${tests.length} tests.`);
        return { success: true, updatedFolders: folders.length, updatedTests: tests.length };
      }
    } catch (err) {
      console.warn('⚠️ [SYNC] Cloud sync deferred (network offline or server unreachable):', err.message);
      return { success: false, error: err.message };
    }
  },

  // --- LEGACY DISK FALLBACK ---
  async syncWithDisk() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) return;
      const diskData = await res.json();
      if (!diskData || (!Array.isArray(diskData.folders) && !Array.isArray(diskData.tests))) {
        return;
      }

      const db = await openDB();
      const localFolders = await this.getFolders();
      const localTests = await this.getAllTests();

      const diskFolders = diskData.folders || [];
      const diskTests = diskData.tests || [];

      if ((localFolders.length === 0 && localTests.length === 0) && (diskFolders.length > 0 || diskTests.length > 0)) {
        console.log(`Restoring ${diskFolders.length} folders and ${diskTests.length} tests from local backup...`);
        const fTx = db.transaction('folders', 'readwrite');
        const fStore = fTx.objectStore('folders');
        for (const folder of diskFolders) {
          fStore.put(folder);
        }

        const tTx = db.transaction('tests', 'readwrite');
        const tStore = tTx.objectStore('tests');
        for (const test of diskTests) {
          tStore.put(test);
        }

        await new Promise((resolve) => {
          tTx.oncomplete = () => resolve();
          tTx.onerror = () => resolve();
        });
      }
    } catch (err) {
      // Ignored if local disk server is not running
    }
  },

  // --- FOLDERS API ---
  async getFolders() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('folders', 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async saveFolder(folder) {
    const db = await openDB();

    // 1. Save to local IndexedDB immediately
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('folders', 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.put(folder);
      request.onsuccess = () => resolve(folder);
      request.onerror = () => reject(request.error);
    });

    // 2. Sync to Cloud API or queue for offline
    if (apiClient.isAuthenticated()) {
      try {
        await apiClient.createFolder(folder);
      } catch (err) {
        console.warn('Failed cloud saveFolder, queuing offline mutation:', err.message);
        queuePendingMutation('folder', folder);
      }
    }

    return folder;
  },

  async deleteFolder(folderId) {
    const db = await openDB();

    // 1. Delete associated tests locally
    const tests = await this.getTestsByFolder(folderId);
    for (const test of tests) {
      await this.deleteTest(test.id);
    }

    // 2. Delete folder locally
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('folders', 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.delete(folderId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 3. Sync to Cloud API
    if (apiClient.isAuthenticated()) {
      try {
        await apiClient.deleteFolder(folderId);
      } catch (err) {
        console.warn('Failed cloud deleteFolder, queuing deletion:', err.message);
        queuePendingMutation('folder', { id: folderId, deletedAt: new Date().toISOString() });
      }
    }
  },

  // --- TESTS API ---
  async getAllTests() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tests', 'readonly');
      const store = transaction.objectStore('tests');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async getTestsByFolder(folderId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tests', 'readonly');
      const store = transaction.objectStore('tests');
      const index = store.index('folderId');
      const request = index.getAll(folderId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async saveTest(test) {
    const db = await openDB();

    // 1. Save FULL test (including local paperHtml) into local IndexedDB
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('tests', 'readwrite');
      const store = transaction.objectStore('tests');
      const request = store.put(test);
      request.onsuccess = () => resolve(test);
      request.onerror = () => reject(request.error);
    });

    // 2. Granular Cloud Upload: HARD DEFENSE LAYER 1 - paperHtml is strictly stripped
    if (apiClient.isAuthenticated()) {
      try {
        await apiClient.saveTest(test);
      } catch (err) {
        console.warn('Failed cloud saveTest, queuing offline mutation:', err.message);
        queuePendingMutation('test', test);
      }
    }

    return test;
  },

  async deleteTest(testId) {
    const db = await openDB();

    // 1. Delete from local IndexedDB
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('tests', 'readwrite');
      const store = transaction.objectStore('tests');
      const request = store.delete(testId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 2. Delete from Cloud
    if (apiClient.isAuthenticated()) {
      try {
        await apiClient.deleteTest(testId);
      } catch (err) {
        console.warn('Failed cloud deleteTest, queuing deletion:', err.message);
        queuePendingMutation('test', { id: testId, deletedAt: new Date().toISOString() });
      }
    }
  },

  // --- BULK IMPORT/EXPORT ---
  async exportDatabase() {
    const folders = await this.getFolders();
    const tests = await this.getAllTests();
    return JSON.stringify({ folders, tests }, null, 2);
  },

  async importDatabase(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      if (!data.folders || !data.tests) {
        throw new Error('Invalid backup file format.');
      }

      const db = await openDB();

      // Clear and import folders
      const fTx = db.transaction('folders', 'readwrite');
      const fStore = fTx.objectStore('folders');
      fStore.clear();
      for (const folder of data.folders) {
        fStore.put(folder);
      }

      // Clear and import tests
      const tTx = db.transaction('tests', 'readwrite');
      const tStore = tTx.objectStore('tests');
      tStore.clear();
      for (const test of data.tests) {
        tStore.put(test);
      }

      // Trigger cloud sync to push imported data to Atlas
      if (apiClient.isAuthenticated()) {
        this.syncWithCloud();
      }

      return true;
    } catch (e) {
      console.error('Import database error:', e);
      throw e;
    }
  },

  // Direct offline seed helper (populates local IndexedDB without triggering cloud mutation loops)
  async seedDefaultData(folders = [], tests = []) {
    try {
      const db = await openDB();
      if (Array.isArray(folders) && folders.length > 0) {
        const fTx = db.transaction('folders', 'readwrite');
        const fStore = fTx.objectStore('folders');
        for (const folder of folders) {
          fStore.put(folder);
        }
        await new Promise(res => {
          fTx.oncomplete = () => res();
          fTx.onerror = () => res();
        });
      }
      if (Array.isArray(tests) && tests.length > 0) {
        const tTx = db.transaction('tests', 'readwrite');
        const tStore = tTx.objectStore('tests');
        for (const test of tests) {
          tStore.put(test);
        }
        await new Promise(res => {
          tTx.oncomplete = () => res();
          tTx.onerror = () => res();
        });
      }
      return true;
    } catch (e) {
      console.warn('seedDefaultData error:', e);
      return false;
    }
  }
};

// Automatic online event sync trigger
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Network online detected, triggering cloud sync...');
    dbService.syncWithCloud();
  });
}
