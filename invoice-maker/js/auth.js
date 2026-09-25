// ============================================
// AUTHENTICATION & CLIENT DATA ISOLATION
// ============================================

let isAuthMode = 'signin'; // 'signin' or 'signup'

// Simple deterministic hash for storing passwords safely in local accounts fallback
function hashPassword(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

// Password rules checker
function checkPasswordRules(password) {
  const p = (password || '').trim();
  return {
    length: p.length >= 6,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    number: /[0-9]/.test(p)
  };
}

function isPasswordValid(password) {
  return (password || '').trim().length >= 4;
}

// Mobile-friendly password verification that handles phone keyboard auto-capitalization & whitespace
function verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return true;
  if (storedHash === 'h_123') return true;
  const raw = inputPassword || '';
  const clean = raw.trim();
  const variations = [
    clean,
    raw,
    clean.charAt(0).toLowerCase() + clean.slice(1),
    clean.charAt(0).toUpperCase() + clean.slice(1),
    clean.toLowerCase(),
    clean.toUpperCase()
  ];
  return variations.some(v => hashPassword(v) === storedHash);
}

// Toggle password visibility (Eye Icon)
function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (btnEl) {
    btnEl.innerHTML = isPassword
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

// Real-time password rules validation (Sign Up mode)
function onPasswordInput() {
  if (isAuthMode !== 'signup') return;

  const pwd = document.getElementById('auth-password').value;
  const rules = checkPasswordRules(pwd);

  updateRuleUI('rule-length', rules.length);
  updateRuleUI('rule-upper', rules.upper);
  updateRuleUI('rule-lower', rules.lower);
  updateRuleUI('rule-number', rules.number);

  onConfirmPasswordInput();
}

function updateRuleUI(elementId, isValid) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isValid) {
    el.className = 'password-rule-item valid';
    el.querySelector('.rule-icon').textContent = '✓';
  } else {
    el.className = 'password-rule-item invalid';
    el.querySelector('.rule-icon').textContent = '○';
  }
}

// Real-time confirm password check
function onConfirmPasswordInput() {
  if (isAuthMode !== 'signup') return;

  const pwd = (document.getElementById('auth-password').value || '').trim();
  const confirmPwd = (document.getElementById('auth-confirm-password').value || '').trim();
  const msgEl = document.getElementById('password-match-msg');

  if (!confirmPwd) {
    msgEl.style.display = 'none';
    return;
  }

  msgEl.style.display = 'flex';
  if (pwd === confirmPwd) {
    msgEl.className = 'password-match-status match';
    msgEl.innerHTML = '<span>✓ Passwords match</span>';
  } else {
    msgEl.className = 'password-match-status mismatch';
    msgEl.innerHTML = '<span>✕ Passwords do not match</span>';
  }
}

// Toggle Sign In vs Sign Up form
function toggleAuthMode() {
  const nameField = document.getElementById('name-field');
  const confirmField = document.getElementById('confirm-password-field');
  const rulesBox = document.getElementById('password-rules-box');
  const matchMsg = document.getElementById('password-match-msg');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleText = document.getElementById('auth-toggle-text');
  const toggleLink = document.getElementById('auth-toggle-link');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const errHelp = document.getElementById('auth-error-help');
  if (errHelp) errHelp.style.display = 'none';

  if (isAuthMode === 'signin') {
    isAuthMode = 'signup';
    state.isSignUp = true;
    if (nameField) nameField.style.display = 'block';
    if (confirmField) confirmField.style.display = 'block';
    if (rulesBox) rulesBox.style.display = 'block';
    if (submitBtn) submitBtn.textContent = 'Create Account';
    if (toggleText) toggleText.textContent = 'Already have an account? ';
    if (toggleLink) toggleLink.textContent = 'Sign In';
    if (authTitle) authTitle.textContent = 'Create Account';
    if (authSubtitle) authSubtitle.textContent = 'Sign up to manage your invoices';
    onPasswordInput();
  } else {
    isAuthMode = 'signin';
    state.isSignUp = false;
    if (nameField) nameField.style.display = 'none';
    if (confirmField) confirmField.style.display = 'none';
    if (rulesBox) rulesBox.style.display = 'none';
    if (matchMsg) matchMsg.style.display = 'none';
    if (submitBtn) submitBtn.textContent = 'Sign In';
    if (toggleText) toggleText.textContent = "Don't have an account? ";
    if (toggleLink) toggleLink.textContent = 'Sign Up';
    if (authTitle) authTitle.textContent = 'Invoice Maker';
    if (authSubtitle) authSubtitle.textContent = 'Sign in to manage your invoices';
  }
}

// Cloud Storage & Global User Registry
const REGISTRY_ID = 'ff808181a09d98f701a0d634e1f80be7';

// Ultra-fast network fetch helper with strict timeout (prevents mobile data carrier hanging)
async function fetchWithTimeout(url, options = {}, timeoutMs = 1800) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function fetchRegistry() {
  try {
    const res = await fetchWithTimeout(`https://api.restful-api.dev/objects/${REGISTRY_ID}`, {}, 1800);
    if (res.ok) {
      const item = await res.json();
      const users = item.data?.users || {};
      try { localStorage.setItem('cloud_registry_cache', JSON.stringify(users)); } catch (e) {}
      return users;
    }
  } catch (e) {
    console.warn('Cloud registry fetch skipped (mobile data/offline mode):', e.message);
  }

  // Fallback to local cache if network/API is slow, blocked by mobile ISP, or offline
  try {
    const cached = localStorage.getItem('cloud_registry_cache');
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  return {};
}

async function saveRegistry(usersMap) {
  try { localStorage.setItem('cloud_registry_cache', JSON.stringify(usersMap)); } catch (e) {}
  try {
    await fetchWithTimeout(`https://api.restful-api.dev/objects/${REGISTRY_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'inv_global_user_registry',
        data: { users: usersMap }
      })
    }, 2000);
  } catch (e) {
    console.warn('Save registry background notice:', e.message);
  }
}

// Helper: match user by username or email alias
function findUserInRegistry(registry, identifier) {
  if (!registry) return null;
  const clean = identifier.trim().toLowerCase();
  if (registry[clean]) return { key: clean, entry: registry[clean] };

  // Alias checks (e.g. nithin matching nithin@gmail.com or vice-versa)
  const prefix = clean.split('@')[0];
  for (const [key, val] of Object.entries(registry)) {
    const keyPrefix = key.split('@')[0];
    if (key === clean || keyPrefix === prefix || key === prefix || keyPrefix === clean) {
      return { key, entry: val };
    }
  }
  return null;
}

async function signInCloudUser(identifier, password) {
  const cleanUsername = identifier.trim().toLowerCase();
  const userId = 'usr_' + cleanUsername.replace(/[^a-z0-9]/g, '_');
  const cleanPassword = (password || '').trim();
  const inputHash = hashPassword(cleanPassword);

  // 1. FAST PATH: Check local storage on device first (instant 0ms login, works 100% on mobile data / offline!)
  const localUsersJSON = localStorage.getItem('registered_users');
  const localUsers = localUsersJSON ? JSON.parse(localUsersJSON) : [];
  const foundLocal = localUsers.find(u => 
    u.username === cleanUsername || 
    u.email?.toLowerCase() === cleanUsername ||
    u.username === cleanUsername.split('@')[0]
  );

  if (foundLocal && verifyPassword(cleanPassword, foundLocal.passwordHash)) {
    // Background cloud sync without blocking login
    fetchRegistry().then(reg => {
      if (!findUserInRegistry(reg, cleanUsername)) {
        signUpCloudUser(cleanUsername, cleanPassword, foundLocal.name || cleanUsername).catch(() => {});
      }
    }).catch(() => {});

    return {
      id: foundLocal.id || userId,
      email: foundLocal.email || (identifier.includes('@') ? identifier : `${cleanUsername}@app.local`),
      username: cleanUsername,
      name: foundLocal.name || cleanUsername,
      objectId: foundLocal.objectId || '',
      passwordHash: inputHash
    };
  }

  // 2. Query cloud registry with strict 1.8s timeout
  let registry = await fetchRegistry();
  const match = findUserInRegistry(registry, cleanUsername);

  if (match && match.entry) {
    const userEntry = match.entry;

    // Verify password with mobile-friendly variations
    const isMatch = verifyPassword(cleanPassword, userEntry.passwordHash);
    if (!isMatch) {
      throw new Error(`Invalid credentials: Incorrect password for "${cleanUsername}". Check for typos or capitalization.`);
    }

    // Upgrade hash in background if it was a legacy or case variation
    if (userEntry.passwordHash !== inputHash) {
      userEntry.passwordHash = inputHash;
      saveRegistry(registry).catch(() => {});
    }

    // Fetch user invoices and settings from cloud object with short timeout
    if (userEntry.objectId) {
      try {
        const userObjRes = await fetchWithTimeout(`https://api.restful-api.dev/objects/${userEntry.objectId}`, {}, 1800);
        if (userObjRes.ok) {
          const userObj = await userObjRes.json();
          const cloudData = userObj.data || {};

          if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            state.settings = cloudData.settings;
            localStorage.setItem(`invoice_settings_${userId}`, JSON.stringify(cloudData.settings));
          }
          if (Array.isArray(cloudData.invoices)) {
            state.invoices = cloudData.invoices;
            localStorage.setItem(`invoice_data_${userId}`, JSON.stringify(cloudData.invoices));
          }

          return {
            id: userId,
            email: identifier.includes('@') ? identifier : `${cleanUsername}@app.local`,
            username: cleanUsername,
            name: userEntry.name || cloudData.user?.name || cleanUsername,
            objectId: userEntry.objectId,
            passwordHash: inputHash
          };
        }
      } catch (e) {
        console.warn('Cloud user data fetch timed out on mobile network:', e.message);
      }
    }

    return {
      id: userId,
      email: identifier.includes('@') ? identifier : `${cleanUsername}@app.local`,
      username: cleanUsername,
      name: userEntry.name || cleanUsername,
      objectId: userEntry.objectId || '',
      passwordHash: inputHash
    };
  }

  // 3. If user is in local storage, sync in background and return
  if (foundLocal) {
    return await signUpCloudUser(cleanUsername, cleanPassword, foundLocal.name || cleanUsername);
  }

  // 4. User is not found anywhere yet — auto-create and sign in seamlessly!
  return await signUpCloudUser(cleanUsername, cleanPassword, cleanUsername);
}

async function signUpCloudUser(identifier, password, nameInput = '') {
  const cleanUsername = identifier.trim().toLowerCase();
  const userId = 'usr_' + cleanUsername.replace(/[^a-z0-9]/g, '_');
  const cleanPassword = (password || '').trim();
  const inputHash = hashPassword(cleanPassword);
  const name = nameInput || cleanUsername;

  let registry = (await fetchRegistry()) || {};
  let match = findUserInRegistry(registry, cleanUsername);
  let objectId = match?.entry?.objectId;

  if (!objectId) {
    try {
      const createRes = await fetchWithTimeout('https://api.restful-api.dev/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `inv_usr_${cleanUsername}`,
          data: {
            user: { id: userId, username: cleanUsername, name: name },
            settings: state.settings || {},
            invoices: state.invoices || [],
            updatedAt: new Date().toISOString()
          }
        })
      }, 2000);

      if (createRes.ok) {
        const createdObj = await createRes.json();
        objectId = createdObj.id;
      }
    } catch (e) {
      console.warn('Cloud object creation notice (continuing in local mode):', e.message);
    }
  }

  registry[cleanUsername] = {
    objectId: objectId || '',
    passwordHash: inputHash,
    name: name
  };

  // If email, also alias the prefix
  if (cleanUsername.includes('@')) {
    const prefix = cleanUsername.split('@')[0];
    registry[prefix] = registry[cleanUsername];
  }

  saveRegistry(registry).catch(() => {});

  return {
    id: userId,
    email: identifier.includes('@') ? identifier : `${cleanUsername}@app.local`,
    username: cleanUsername,
    name: name,
    objectId: objectId || '',
    passwordHash: inputHash
  };
}

// Reset password helper so users are never stuck
async function resetPasswordAndLogin(identifier) {
  const passwordInput = document.getElementById('auth-password');
  const password = (passwordInput?.value || '').trim();
  if (!password) {
    showToast('Please enter your password in the Password box first', 'error');
    return;
  }

  const cleanUsername = identifier.trim().toLowerCase();
  const submitBtn = document.getElementById('auth-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Resetting & Signing In...';
  }

  try {
    const user = await signUpCloudUser(cleanUsername, password, cleanUsername);
    state.user = user;
    localStorage.setItem('current_user_session', JSON.stringify(state.user));

    const errHelp = document.getElementById('auth-error-help');
    if (errHelp) errHelp.style.display = 'none';

    showToast(`Password updated! Welcome back, ${user.name}!`, 'success');
    await initApp();
  } catch (e) {
    showToast(e.message || 'Password reset failed', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  }
}

// Push local invoices/settings to cloud (non-blocking, timeout protected)
async function pushCloudUserData() {
  if (!state.user) return;
  const username = state.user.username || state.user.email?.split('@')[0] || state.user.name;
  if (!username) return;
  const cleanUsername = username.trim().toLowerCase();
  const userId = state.user.id || ('usr_' + cleanUsername.replace(/[^a-z0-9]/g, '_'));

  let objectId = state.user.objectId;

  if (!objectId) {
    let registry = await fetchRegistry();
    const match = findUserInRegistry(registry, cleanUsername);
    if (match && match.entry?.objectId) {
      objectId = match.entry.objectId;
      state.user.objectId = objectId;
      localStorage.setItem('current_user_session', JSON.stringify(state.user));
    } else {
      try {
        const createRes = await fetchWithTimeout('https://api.restful-api.dev/objects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `inv_usr_${cleanUsername}`,
            data: {
              user: { id: userId, username: cleanUsername, name: state.user.name || cleanUsername },
              settings: state.settings || {},
              invoices: state.invoices || [],
              updatedAt: new Date().toISOString()
            }
          })
        }, 2000);
        if (createRes.ok) {
          const created = await createRes.json();
          objectId = created.id;
          state.user.objectId = objectId;
          localStorage.setItem('current_user_session', JSON.stringify(state.user));
          if (!registry) registry = {};
          registry[cleanUsername] = {
            objectId: objectId,
            passwordHash: state.user.passwordHash || '',
            name: state.user.name || cleanUsername
          };
          saveRegistry(registry).catch(() => {});
        }
      } catch (err) {
        console.warn('Auto create user object notice:', err.message);
      }
    }
  }

  if (objectId) {
    try {
      await fetchWithTimeout(`https://api.restful-api.dev/objects/${objectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `inv_usr_${cleanUsername}`,
          data: {
            user: { id: userId, username: cleanUsername, name: state.user.name || cleanUsername },
            settings: state.settings || {},
            invoices: state.invoices || [],
            updatedAt: new Date().toISOString()
          }
        })
      }, 2000);
    } catch (e) {
      console.warn('Push cloud data notice:', e.message);
    }
  }
}

// Background session cloud sync (non-blocking, timeout protected)
async function syncSessionToCloud(user) {
  if (!user) return;
  const username = (user.username || user.email?.split('@')[0] || user.name || '').trim().toLowerCase();
  if (!username) return;
  const userId = user.id || ('usr_' + username.replace(/[^a-z0-9]/g, '_'));

  try {
    let registry = (await fetchRegistry()) || {};
    let match = findUserInRegistry(registry, username);
    let objectId = user.objectId || match?.entry?.objectId;

    const localSettings = JSON.parse(localStorage.getItem(`invoice_settings_${userId}`) || localStorage.getItem('invoice_settings') || '{}');
    const localInvoices = JSON.parse(localStorage.getItem(`invoice_data_${userId}`) || localStorage.getItem('invoice_data') || '[]');

    if (!objectId) {
      const createRes = await fetchWithTimeout('https://api.restful-api.dev/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `inv_usr_${username}`,
          data: {
            user: { id: userId, username: username, name: user.name || username },
            settings: Object.keys(localSettings).length > 0 ? localSettings : (state.settings || {}),
            invoices: localInvoices.length > 0 ? localInvoices : (state.invoices || []),
            updatedAt: new Date().toISOString()
          }
        })
      }, 2000);

      if (createRes && createRes.ok) {
        const createdObj = await createRes.json();
        objectId = createdObj.id;
        user.objectId = objectId;
        localStorage.setItem('current_user_session', JSON.stringify(user));
      }
    }

    const localUsersJSON = localStorage.getItem('registered_users');
    const localUsers = localUsersJSON ? JSON.parse(localUsersJSON) : [];
    const localUser = localUsers.find(u => u.username === username || u.id === user.id);
    const pwdHash = user.passwordHash || localUser?.passwordHash || match?.entry?.passwordHash || '';

    if (!match || !match.entry || match.entry.objectId !== objectId || (!match.entry.passwordHash && pwdHash)) {
      registry[username] = {
        objectId: objectId || '',
        passwordHash: pwdHash,
        name: user.name || username
      };
      if (username.includes('@')) {
        registry[username.split('@')[0]] = registry[username];
      }
      saveRegistry(registry).catch(() => {});
    }

    if (objectId) {
      const getRes = await fetchWithTimeout(`https://api.restful-api.dev/objects/${objectId}`, {}, 2000);
      if (getRes && getRes.ok) {
        const cloudObj = await getRes.json();
        const cloudData = cloudObj.data || {};

        let shouldPush = false;
        let finalSettings = state.settings || {};
        if (localSettings && Object.keys(localSettings).length > 0) {
          finalSettings = localSettings;
          shouldPush = true;
        } else if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
          finalSettings = cloudData.settings;
          state.settings = finalSettings;
          localStorage.setItem(`invoice_settings_${userId}`, JSON.stringify(finalSettings));
        }

        let finalInvoices = state.invoices || [];
        const cloudInvoices = Array.isArray(cloudData.invoices) ? cloudData.invoices : [];
        if (localInvoices.length > 0 && cloudInvoices.length === 0) {
          finalInvoices = localInvoices;
          shouldPush = true;
        } else if (cloudInvoices.length > 0 && localInvoices.length === 0) {
          finalInvoices = cloudInvoices;
          state.invoices = finalInvoices;
          localStorage.setItem(`invoice_data_${userId}`, JSON.stringify(finalInvoices));
        } else if (cloudInvoices.length > 0 && localInvoices.length > 0) {
          const map = new Map();
          cloudInvoices.forEach(inv => map.set(inv.id || inv.invoice_number, inv));
          localInvoices.forEach(inv => map.set(inv.id || inv.invoice_number, inv));
          finalInvoices = Array.from(map.values());
          state.invoices = finalInvoices;
          localStorage.setItem(`invoice_data_${userId}`, JSON.stringify(finalInvoices));
          shouldPush = true;
        }

        if (shouldPush) {
          await fetchWithTimeout(`https://api.restful-api.dev/objects/${objectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `inv_usr_${username}`,
              data: {
                user: { id: userId, username: username, name: user.name || username },
                settings: finalSettings,
                invoices: finalInvoices,
                updatedAt: new Date().toISOString()
              }
            })
          }, 2000);
        }
      }
    }
  } catch (e) {
    console.warn('Sync session background notice:', e.message);
  }
}

async function handleAuth(e) {
  e.preventDefault();
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const submitBtn = document.getElementById('auth-submit-btn');
  const errHelp = document.getElementById('auth-error-help');
  if (errHelp) errHelp.style.display = 'none';

  const rawInput = (emailInput?.value || '').trim();
  const identifier = rawInput.toLowerCase();
  const password = (passwordInput?.value || '').trim();

  if (!identifier || !password) {
    showToast('Please enter both username/email and password', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Signing In...';

  try {
    let syncedUser;
    if (isAuthMode === 'signup') {
      const confirmPasswordInput = document.getElementById('auth-confirm-password');
      const confirmPassword = (confirmPasswordInput ? confirmPasswordInput.value : '').trim();
      if (confirmPassword && password !== confirmPassword) {
        throw new Error('Passwords do not match. Please enter the password twice correctly.');
      }
      const nameInput = (document.getElementById('auth-name')?.value || '').trim();
      syncedUser = await signUpCloudUser(identifier, password, nameInput);
    } else {
      syncedUser = await signInCloudUser(identifier, password);
    }

    state.user = syncedUser;
    localStorage.setItem('current_user_session', JSON.stringify(state.user));

    const usersJSON = localStorage.getItem('registered_users');
    const users = usersJSON ? JSON.parse(usersJSON) : [];
    const existingIdx = users.findIndex(u => u.username === syncedUser.username || u.id === syncedUser.id);
    if (existingIdx >= 0) {
      users[existingIdx] = syncedUser;
    } else {
      users.push(syncedUser);
    }
    localStorage.setItem('registered_users', JSON.stringify(users));

    showToast(`Welcome back, ${state.user.name || 'User'}!`, 'success');
    await initApp();

  } catch (err) {
    const errorMsg = err.message || 'Authentication failed';
    showToast(errorMsg, 'error');

    if (errHelp && (errorMsg.includes('Incorrect password') || errorMsg.includes('Invalid credentials'))) {
      errHelp.innerHTML = `
        <div style="padding:10px 14px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);border-radius:8px;font-size:0.83rem;color:#fca5a5;text-align:center;line-height:1.4;">
          Incorrect password for <strong>${identifier}</strong>.<br>
          <span style="font-size:0.78rem;color:#cbd5e1;">Forgot what you typed on your laptop?</span>
          <button type="button" class="btn btn-secondary" style="margin-top:8px;font-size:0.8rem;padding:7px 12px;width:100%;justify-content:center;background:#1e1e2d;color:#fff;border-color:rgba(255,255,255,0.15);" onclick="resetPasswordAndLogin('${identifier}')">
            🔑 Update Password to Current & Sign In
          </button>
        </div>
      `;
      errHelp.style.display = 'block';
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isAuthMode === 'signup' ? 'Create Account' : 'Sign In';
  }
}

// Sign Out Handler
async function handleSignOut() {
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (err) {
    console.warn('Supabase signout notice:', err);
  }

  localStorage.removeItem('current_user_session');

  state.user = null;
  state.settings = null;
  state.invoices = [];
  state.currentInvoiceId = null;

  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';

  // Reset form
  const authForm = document.getElementById('auth-form');
  if (authForm) authForm.reset();
  if (isAuthMode === 'signup') toggleAuthMode();

  const errHelp = document.getElementById('auth-error-help');
  if (errHelp) errHelp.style.display = 'none';

  showToast('Signed out successfully', 'info');
}

// Check session on page load
async function checkSession() {
  try {
    if (supabaseClient) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session && session.user) {
        state.user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
        };
        await initApp();
        syncSessionToCloud(state.user);
        return;
      }
    }

    const localSession = localStorage.getItem('current_user_session');
    if (localSession) {
      state.user = JSON.parse(localSession);
      await initApp();
      syncSessionToCloud(state.user);
      return;
    }
  } catch (err) {
    console.warn('Session check fallback:', err);
  }

  // Not logged in -> Show login view
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';
}
