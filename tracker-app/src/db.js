const DB_NAME = 'GATERevisionTrackerDB';
const DB_VERSION = 1;

// Helper to open connection
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

export const dbService = {
  // --- FOLDERS API ---
  async getFolders() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('folders', 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveFolder(folder) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('folders', 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.put(folder);
      
      request.onsuccess = () => resolve(folder);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteFolder(folderId) {
    const db = await openDB();
    
    // First, delete all tests associated with this folder
    const tests = await this.getTestsByFolder(folderId);
    for (const test of tests) {
      await this.deleteTest(test.id);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('folders', 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.delete(folderId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- TESTS API ---
  async getAllTests() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tests', 'readonly');
      const store = transaction.objectStore('tests');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
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
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveTest(test) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tests', 'readwrite');
      const store = transaction.objectStore('tests');
      const request = store.put(test);
      
      request.onsuccess = () => resolve(test);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteTest(testId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tests', 'readwrite');
      const store = transaction.objectStore('tests');
      const request = store.delete(testId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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
      
      return true;
    } catch (e) {
      console.error('Import database error:', e);
      throw e;
    }
  }
};
