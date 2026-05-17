/**
 * RictWorld Backend API Client v3.0
 * Shared world + per-player state.
 */

function resolveApiBase() {
  if (typeof window !== 'undefined' && window.BACKEND_URL) {
    return window.BACKEND_URL;
  }
  if (typeof BACKEND_URL !== 'undefined') {
    return BACKEND_URL;
  }
  return 'http://localhost:10021';
}
const API_BASE = resolveApiBase();

const STORAGE_KEYS = {
  token: 'rictworld_token',
  username: 'rictworld_username',
  mode: 'rictworld_mode',
  world: 'rictworld_world',       // local world cache
  player: 'rictworld_player',     // local player cache
};

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
  localStorage.removeItem(STORAGE_KEYS.world);
  localStorage.removeItem(STORAGE_KEYS.player);
}

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

// ─── Auth ────────────────────────────────────────────────────────

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

export async function checkServerHealth() {
  try {
    const resp = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    const json = await resp.json();
    return { alive: resp.ok, version: json.version };
  } catch {
    return { alive: false, version: null };
  }
}

// ─── World (shared by all players) ──────────────────────────────

export async function loadWorld() {
  return api('GET', '/api/world');
}

export async function saveWorld(worldData) {
  return api('POST', '/api/world', { worldData });
}

// ─── Player (per user) ──────────────────────────────────────────

export async function loadPlayerState() {
  return api('GET', '/api/player');
}

export async function savePlayerState(playerData) {
  return api('POST', '/api/player', { playerData });
}

// ─── Local storage helpers ──────────────────────────────────────

export function saveWorldToLocal(worldData) {
  localStorage.setItem(STORAGE_KEYS.world, worldData);
}

export function loadWorldFromLocal() {
  return localStorage.getItem(STORAGE_KEYS.world);
}

export function savePlayerToLocal(playerData) {
  localStorage.setItem(STORAGE_KEYS.player, playerData);
}

export function loadPlayerFromLocal() {
  return localStorage.getItem(STORAGE_KEYS.player);
}

export function hasLocalWorld() {
  return !!localStorage.getItem(STORAGE_KEYS.world);
}

export function hasLocalPlayer() {
  return !!localStorage.getItem(STORAGE_KEYS.player);
}

// ─── Legacy compat ──────────────────────────────────────────────

/** @deprecated Use loadWorld() + loadPlayerState() instead */
export async function loadFromServer() { return api('GET', '/api/load'); }
/** @deprecated Use saveWorld() + savePlayerState() instead */
export async function saveToServer(saveData) { return api('POST', '/api/save', { saveData }); }
/** @deprecated Use saveWorldToLocal() */
export function saveToLocal(saveData) { localStorage.setItem('rictworld_save', saveData); }
/** @deprecated Use loadWorldFromLocal() */
export function loadFromLocal() { return localStorage.getItem('rictworld_save'); }
/** @deprecated Use hasLocalWorld() */
export function hasLocalSave() { return !!localStorage.getItem('rictworld_save'); }

export { API_BASE };
