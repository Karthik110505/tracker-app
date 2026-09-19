// Frontend API client for GATE Tracker communicating with the cloud backend

const TOKEN_KEY = 'gate_tracker_jwt';
const API_URL_KEY = 'gate_tracker_api_base_url';

export const DEFAULT_PUBLIC_API_URL = 'https://gate-tracker-api.onrender.com/api';
export const EMULATOR_API_URL = 'http://10.0.2.2:5000/api';

export function getApiBaseUrl() {
  const customUrl = localStorage.getItem(API_URL_KEY);
  if (customUrl) return customUrl.replace(/\/$/, '');

  // If inside Capacitor Android native app
  const isNative = typeof window !== 'undefined' && (
    window.Capacitor !== undefined ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    window.location.protocol === 'content:'
  );

  if (isNative) {
    return DEFAULT_PUBLIC_API_URL;
  }

  // If in browser / desktop Vite
  if (typeof window !== 'undefined' && window.location && window.location.port === '5173') {
    return '/api';
  }

  return '/api';
}

export function setApiBaseUrl(url) {
  if (!url) {
    localStorage.removeItem(API_URL_KEY);
  } else {
    localStorage.setItem(API_URL_KEY, url.trim().replace(/\/$/, ''));
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      // Token expired or invalid
      removeToken();
      localStorage.removeItem('gate_tracker_auth');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }

    return data;
  } catch (err) {
    console.warn(`API request to ${url} failed:`, err.message);
    throw err;
  }
}

export const apiClient = {
  // --- AUTHENTICATION ---
  async login(password, username = 'karthik') {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.token) {
      setToken(res.token);
      localStorage.setItem('gate_tracker_auth', 'true');
    }
    return res;
  },

  logout() {
    removeToken();
    localStorage.removeItem('gate_tracker_auth');
  },

  isAuthenticated() {
    return !!getToken();
  },

  async getMe() {
    return request('/auth/me');
  },

  // --- FOLDERS ---
  async getFolders() {
    const res = await request('/folders');
    return res.folders || [];
  },

  async createFolder(folder) {
    const res = await request('/folders', {
      method: 'POST',
      body: JSON.stringify({
        id: folder.id,
        name: folder.name,
        color: folder.color
      })
    });
    return res.folder;
  },

  async updateFolder(id, data) {
    const res = await request(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.folder;
  },

  async deleteFolder(id) {
    return request(`/folders/${id}`, { method: 'DELETE' });
  },

  // --- TESTS ---
  async getTests(folderId = null) {
    const endpoint = folderId ? `/tests?folderId=${encodeURIComponent(folderId)}` : '/tests';
    const res = await request(endpoint);
    return res.tests || [];
  },

  async getTest(id) {
    const res = await request(`/tests/${id}`);
    return res.test;
  },

  // HARD DEFENSE LAYER 1: Strip paperHtml from cloud payload
  async saveTest(testRecord) {
    const { paperHtml: _paperHtml, ...cloudPayload } = testRecord;
    const res = await request('/tests', {
      method: 'POST',
      body: JSON.stringify(cloudPayload)
    });
    return res.test;
  },

  async updateTest(id, testData) {
    const { paperHtml: _paperHtml, ...cloudPayload } = testData;
    const res = await request(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cloudPayload)
    });
    return res.test;
  },

  async deleteTest(id) {
    return request(`/tests/${id}`, { method: 'DELETE' });
  },

  // --- INCREMENTAL SYNC ---
  async fetchSync(sinceTimestamp) {
    const endpoint = sinceTimestamp ? `/sync?since=${encodeURIComponent(sinceTimestamp)}` : '/sync';
    return request(endpoint);
  },

  async pushSync(folders = [], tests = []) {
    // Strip paperHtml from all tests being pushed
    const sanitizedTests = tests.map(t => {
      const { paperHtml: _paperHtml, ...rest } = t;
      return rest;
    });
    return request('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ folders, tests: sanitizedTests })
    });
  }
};
