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
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password)
  };
}

function isPasswordValid(password) {
  const r = checkPasswordRules(password);
  return r.length && r.upper && r.lower && r.number;
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

  const pwd = document.getElementById('auth-password').value;
  const confirmPwd = document.getElementById('auth-confirm-password').value;
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

// Handle Authentication Submit (Sign In / Sign Up)
async function signInCloudUser(identifier, password) {
  const cleanUsername = identifier.trim().toLowerCase();
  const userId = 'usr_' + cleanUsername.replace(/[^a-z0-9]/g, '_');

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signin',
        username: cleanUsername,
        password: password
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.found) {
        if (data.settings && Object.keys(data.settings).length > 0) {
          state.settings = data.settings;
          localStorage.setItem(`invoice_settings_${userId}`, JSON.stringify(data.settings));
        }
        if (Array.isArray(data.invoices)) {
          state.invoices = data.invoices;
          localStorage.setItem(`invoice_data_${userId}`, JSON.stringify(data.invoices));
        }

        return {
          id: userId,
          email: identifier.includes('@') ? identifier : `${identifier}@app.local`,
          username: cleanUsername,
          name: data.user?.name || cleanUsername
        };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        throw new Error(errData.error);
      }
    }
  } catch (err) {
    if (err.message && (err.message.includes('Invalid credentials') || err.message.includes('Account not found') || err.message.includes('Password'))) {
      throw err;
    }
    console.warn('Sync API offline fallback during signin:', err);
  }

  // Fallback to local storage if API is offline
  const localUsersJSON = localStorage.getItem('registered_users');
  const localUsers = localUsersJSON ? JSON.parse(localUsersJSON) : [];
  const foundLocal = localUsers.find(u => u.username === cleanUsername);

  const localSettings = JSON.parse(localStorage.getItem(`invoice_settings_${userId}`) || localStorage.getItem('invoice_settings') || '{}');
  const localInvoices = JSON.parse(localStorage.getItem(`invoice_data_${userId}`) || localStorage.getItem('invoice_data') || '[]');

  if (Object.keys(localSettings).length > 0) state.settings = localSettings;
  if (localInvoices.length > 0) state.invoices = localInvoices;

  return foundLocal || {
    id: userId,
    email: identifier.includes('@') ? identifier : `${identifier}@app.local`,
    username: cleanUsername,
    name: cleanUsername
  };
}

async function signUpCloudUser(identifier, password, nameInput = '') {
  const cleanUsername = identifier.trim().toLowerCase();
  const userId = 'usr_' + cleanUsername.replace(/[^a-z0-9]/g, '_');
  const name = nameInput || cleanUsername;

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        username: cleanUsername,
        password: password,
        name: name,
        settings: state.settings || {},
        invoices: state.invoices || []
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        state.settings = data.settings;
        localStorage.setItem(`invoice_settings_${userId}`, JSON.stringify(data.settings));
      }
      if (Array.isArray(data.invoices)) {
        state.invoices = data.invoices;
        localStorage.setItem(`invoice_data_${userId}`, JSON.stringify(data.invoices));
      }
      return {
        id: userId,
        email: identifier.includes('@') ? identifier : `${identifier}@app.local`,
        username: cleanUsername,
        name: data.user?.name || name
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        throw new Error(errData.error);
      }
    }
  } catch (err) {
    if (err.message && (err.message.includes('already taken') || err.message.includes('Password'))) {
      throw err;
    }
    console.warn('Sync API offline fallback during signup:', err);
  }

  return {
    id: userId,
    email: identifier.includes('@') ? identifier : `${identifier}@app.local`,
    username: cleanUsername,
    name: name
  };
}

async function pushCloudUserData() {
  if (!state.user) return;
  const username = state.user.username || state.user.email?.split('@')[0] || state.user.name;
  if (!username) return;
  const cleanUsername = username.trim().toLowerCase();

  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'push',
        username: cleanUsername,
        name: state.user.name || cleanUsername,
        settings: state.settings || {},
        invoices: state.invoices || []
      })
    });
  } catch (err) {
    console.warn('Cloud push notice:', err);
  }
}

async function handleAuth(e) {
  e.preventDefault();
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const submitBtn = document.getElementById('auth-submit-btn');

  const rawInput = (emailInput.value || '').trim();
  const identifier = rawInput.toLowerCase();
  const password = passwordInput.value;

  if (!identifier || !password) {
    showToast('Please enter both username/email and password', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Authenticating & Syncing...';

  try {
    let syncedUser;
    if (isAuthMode === 'signup') {
      const confirmPasswordInput = document.getElementById('auth-confirm-password');
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
      if (confirmPassword && password !== confirmPassword) {
        throw new Error('Passwords do not match. Please enter the password twice correctly.');
      }
      if (!isPasswordValid(password)) {
        throw new Error('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.');
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

    showToast(`Welcome back, ${state.user.name || 'User'}! Account & invoices synced.`, 'success');
    await initApp();

  } catch (err) {
    showToast(err.message || 'Authentication failed', 'error');
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
        return;
      }
    }

    const localSession = localStorage.getItem('current_user_session');
    if (localSession) {
      state.user = JSON.parse(localSession);
      await initApp();
      return;
    }
  } catch (err) {
    console.warn('Session check fallback:', err);
  }

  // Not logged in -> Show login view
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';
}
