/**
 * RictWorld Backend API Client
 * Manages authentication, save/load, and offline/online mode.
 */

const API_BASE = typeof BACKEND_URL !== 'undefined'
  ? BACKEND_URL
  : (window.BACKEND_URL || 'http://localhost:10021');

const STORAGE_KEYS = {
  token: 'rictworld_token',
  username: 'rictworld_username',
  mode: 'rictworld_mode',
  save: 'rictworld_save',
};

// ── Mode ─────────────────────────────────────────────────────────────────

export const Mode = {
  OFFLINE: 'offline',
  ONLINE: 'online',
};

export function getMode() {
  return localStorage.getItem(STORAGE_KEYS.mode) || Mode.OFFLINE;
}

export function setMode(mode) {
  localStorage.setItem(STORAGE_KEYS.mode, mode);
}

export function isOnline() {
  return getMode() === Mode.ONLINE;
}

// ── Token management ─────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.token, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
  }
}

export function getUsername() {
  return localStorage.getItem(STORAGE_KEYS.username);
}

export function setUsername(name) {
  if (name) {
    localStorage.setItem(STORAGE_KEYS.username, name);
  } else {
    localStorage.removeItem(STORAGE_KEYS.username);
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  setToken(null);
  setUsername(null);
}

// ── API helpers ──────────────────────────────────────────────────────────

async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${API_BASE}${path}`, opts);
  const json = await resp.json();
  return { ok: resp.ok, status: resp.status, ...json };
}

// ── Auth endpoints ───────────────────────────────────────────────────────

export async function register(username, password) {
  return api('POST', '/api/auth/register', { username, password });
}

export async function login(username, password) {
  const result = await api('POST', '/api/auth/login', { username, password });
  if (result.success && result.token) {
    setToken(result.token);
    setUsername(result.username);
  }
  return result;
}

export async function fetchCurrentUser() {
  return api('GET', '/api/auth/me');
}

// ── Save/Load ────────────────────────────────────────────────────────────

export async function saveToServer(saveData) {
  const result = await api('POST', '/api/save', { saveData });
  return result;
}

export async function loadFromServer() {
  return api('GET', '/api/load');
}

export async function checkServerHealth() {
  try {
    const resp = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    const json = await resp.json();
    return { alive: resp.ok, version: json.version };
  } catch {
    return { alive: false, version: null };
  }
}

// ── Offline (localStorage) save/load ─────────────────────────────────────

export function saveToLocal(saveData) {
  localStorage.setItem(STORAGE_KEYS.save, saveData);
}

export function loadFromLocal() {
  return localStorage.getItem(STORAGE_KEYS.save);
}

export function hasLocalSave() {
  return !!localStorage.getItem(STORAGE_KEYS.save);
}
