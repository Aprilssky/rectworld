/**
 * RictWorld Backend API Client
 * Communicates with the Python Flask server running locally behind cpolar.
 * Handles save/load game state via HTTP requests.
 */

// If config.js is loaded, BACKEND_URL will already be defined
const API_BASE = typeof BACKEND_URL !== 'undefined'
  ? BACKEND_URL
  : (window.BACKEND_URL || 'http://localhost:10021');

const API_ENDPOINTS = {
  save:   `${API_BASE}/api/save`,
  load:   `${API_BASE}/api/load`,
  health: `${API_BASE}/api/health`,
};

/**
 * Save game state to the backend server.
 * @param {string} saveData - JSON-serialized game state from Grid.serialize()
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function saveToServer(saveData) {
  try {
    const resp = await fetch(API_ENDPOINTS.save, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveData }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      return { success: false, message: `服务器错误 (${resp.status}): ${err}` };
    }
    const json = await resp.json();
    return { success: true, message: json.message || '存档已保存到服务器' };
  } catch (err) {
    console.warn('保存到服务器失败，回退到本地存储。错误:', err.message);
    return { success: false, message: `网络错误: ${err.message}`, fallback: true };
  }
}

/**
 * Load game state from the backend server.
 * @returns {Promise<{success: boolean, saveData?: string, message: string}>}
 */
export async function loadFromServer() {
  try {
    const resp = await fetch(API_ENDPOINTS.load);
    if (resp.status === 404) {
      return { success: false, message: '服务器上没有存档数据' };
    }
    if (!resp.ok) {
      const err = await resp.text();
      return { success: false, message: `服务器错误 (${resp.status}): ${err}` };
    }
    const json = await resp.json();
    return { success: true, saveData: json.saveData, message: '存档已从服务器加载' };
  } catch (err) {
    console.warn('从服务器加载失败，回退到本地存储。错误:', err.message);
    return { success: false, message: `网络错误: ${err.message}`, fallback: true };
  }
}

/**
 * Check if the backend server is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth() {
  try {
    const resp = await fetch(API_ENDPOINTS.health, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}
