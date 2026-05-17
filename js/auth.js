/**
 * RictWorld Auth Module
 * Handles login/register modal UI and mode switching.
 */
import {
  Mode, getMode, setMode, isOnline,
  isLoggedIn, getUsername, logout,
  register, login, fetchCurrentUser, checkServerHealth,
} from './saveApi.js';

// ── Shared state ─────────────────────────────────────────────────────────

export const authState = {
  mode: getMode(),    // 'online' | 'offline'
  loggedIn: isLoggedIn(),
  username: getUsername(),
  serverAlive: false,
};

// ── DOM refs ─────────────────────────────────────────────────────────────

let els = {};

function initDOM() {
  els = {
    modeToggle:      document.getElementById('modeToggle'),
    modeBtns:        document.querySelectorAll('.mode-btn'),
    userBtn:         document.getElementById('userBtn'),
    statusMsg:       document.getElementById('statusMsg'),
    authOverlay:     document.getElementById('authOverlay'),
    authTitle:       document.getElementById('authTitle'),
    authTabs:        document.querySelectorAll('.auth-tab'),
    loginForm:       document.getElementById('loginForm'),
    registerForm:    document.getElementById('registerForm'),
    loginUser:       document.getElementById('loginUser'),
    loginPass:       document.getElementById('loginPass'),
    loginError:      document.getElementById('loginError'),
    loginBtn:        document.getElementById('loginBtn'),
    regUser:         document.getElementById('regUser'),
    regPass:         document.getElementById('regPass'),
    regPass2:        document.getElementById('regPass2'),
    regError:        document.getElementById('regError'),
    regBtn:          document.getElementById('regBtn'),
    authClose:       document.getElementById('authClose'),
  };
}

// ── UI update ────────────────────────────────────────────────────────────

function updateUI() {
  const online = authState.mode === 'online';
  const loggedIn = authState.loggedIn;

  // Mode buttons
  els.modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === authState.mode);
  });

  // User badge
  if (loggedIn) {
    els.userBtn.textContent = `👤 ${authState.username}`;
    els.userBtn.className = 'user-badge logged-in';
  } else if (online) {
    els.userBtn.textContent = '🔑 登录';
    els.userBtn.className = 'user-badge';
  } else {
    els.userBtn.textContent = '👤 游客';
    els.userBtn.className = 'user-badge';
  }

  // Status
  if (!online) {
    els.statusMsg.innerHTML = '• <span class="status-offline">离线模式</span>';
  } else if (!authState.serverAlive) {
    els.statusMsg.innerHTML = '• <span style="color:#f44336">服务器未连接</span>';
  } else if (!loggedIn) {
    els.statusMsg.innerHTML = '• <span style="color:#ff9800">在线 · 未登录</span>';
  } else {
    els.statusMsg.innerHTML = `• <span class="status-online">☁️ 已连接</span>`;
  }
}

// ── Mode switching ───────────────────────────────────────────────────────

async function switchMode(mode) {
  authState.mode = mode;
  setMode(mode);

  if (mode === 'online') {
    // Check server health
    const health = await checkServerHealth();
    authState.serverAlive = health.alive;
    if (!health.alive) {
      console.warn('⚠️ 无法连接到后端服务器');
    }
  } else {
    // Switch to offline - clear online state but keep token for potential later use
    console.log('📴 切换到离线模式');
  }

  updateUI();
  window.dispatchEvent(new CustomEvent('rictworld:modeChange', { detail: { mode } }));
}

// ── Auth modal ───────────────────────────────────────────────────────────

function showAuth() { els.authOverlay.classList.add('show'); }
function hideAuth() { els.authOverlay.classList.remove('show'); }

function switchTab(tab) {
  els.authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  els.loginForm.classList.toggle('show', tab === 'login');
  els.registerForm.classList.toggle('show', tab === 'register');
  els.loginError.textContent = '';
  els.regError.textContent = '';
}

async function handleLogin() {
  const username = els.loginUser.value.trim();
  const password = els.loginPass.value;
  if (!username || !password) {
    els.loginError.textContent = '请输入用户名和密码';
    return;
  }
  els.loginBtn.disabled = true;
  els.loginBtn.textContent = '登录中...';
  els.loginError.textContent = '';

  const result = await login(username, password);
  if (result.success) {
    authState.loggedIn = true;
    authState.username = result.username;
    hideAuth();
    updateUI();
    console.log(`✅ 登录成功: ${username}`);
  } else {
    els.loginError.textContent = result.error || '登录失败';
  }

  els.loginBtn.disabled = false;
  els.loginBtn.textContent = '登 录';
}

async function handleRegister() {
  const username = els.regUser.value.trim();
  const password = els.regPass.value;
  const password2 = els.regPass2.value;

  els.regError.textContent = '';

  if (!username || username.length < 2) {
    els.regError.textContent = '用户名至少2个字符';
    return;
  }
  if (!password || password.length < 4) {
    els.regError.textContent = '密码至少4位';
    return;
  }
  if (password !== password2) {
    els.regError.textContent = '两次密码不一致';
    return;
  }

  els.regBtn.disabled = true;
  els.regBtn.textContent = '注册中...';

  const result = await register(username, password);
  if (result.success) {
    authState.loggedIn = true;
    authState.username = result.username;
    hideAuth();
    updateUI();
    console.log(`✅ 注册成功: ${username}`);
  } else {
    els.regError.textContent = result.error || '注册失败';
  }

  els.regBtn.disabled = false;
  els.regBtn.textContent = '注 册';
}

function handleLogout() {
  logout();
  authState.loggedIn = false;
  authState.username = null;
  updateUI();
  console.log('👋 已退出登录');
}

// ── Initial check ────────────────────────────────────────────────────────

async function checkLoginOnStart() {
  if (authState.mode !== 'online' || !authState.loggedIn) {
    updateUI();
    return;
  }
  // Verify existing token is still valid
  const health = await checkServerHealth();
  authState.serverAlive = health.alive;
  if (health.alive) {
    const me = await fetchCurrentUser();
    if (!me.success) {
      // Token expired
      logout();
      authState.loggedIn = false;
      authState.username = null;
      console.warn('⚠️ 登录已过期，请重新登录');
    }
  }
  updateUI();
}

// ── Init ─────────────────────────────────────────────────────────────────

export function initAuth() {
  initDOM();

  // Mode toggle
  els.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  // User button
  els.userBtn.addEventListener('click', () => {
    if (authState.loggedIn) {
      if (confirm('退出登录？')) handleLogout();
    } else if (authState.mode === 'online') {
      showAuth();
    }
  });

  // Auth tabs
  els.authTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Login
  els.loginBtn.addEventListener('click', handleLogin);
  els.loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

  // Register
  els.regBtn.addEventListener('click', handleRegister);
  els.regPass2.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });

  // Close
  els.authClose.addEventListener('click', hideAuth);
  els.authOverlay.addEventListener('click', e => { if (e.target === els.authOverlay) hideAuth(); });

  // Initial state
  updateUI();

  // Check server health and login validity
  checkLoginOnStart();
}
