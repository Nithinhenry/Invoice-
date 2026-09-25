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
  submitBtn.innerHTML = '<span class="spinner"></span> Processing...';

  try {
    if (isAuthMode === 'signup') {
      const confirmPassword = document.getElementById('auth-confirm-password').value;
      const name = (document.getElementById('auth-name').value || '').trim();

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match. Please enter the password twice correctly.');
      }

      if (!isPasswordValid(password)) {
        throw new Error('Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number.');
      }

      if (supabaseClient) {
        const email = identifier.includes('@') ? identifier : `${identifier}@app.local`;
        const result = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || rawInput } }
        });
        if (result.error) throw result.error;
        if (result.data.user) {
          state.user = {
            id: result.data.user.id,
            email: result.data.user.email,
            name: name || rawInput
          };
        }
      } else {
        const usersJSON = localStorage.getItem('registered_users');
        const users = usersJSON ? JSON.parse(usersJSON) : [];

        const existing = users.find(u =>
          (u.email && u.email.toLowerCase() === identifier) ||
          (u.username && u.username.toLowerCase() === identifier) ||
          (u.name && u.name.toLowerCase() === identifier)
        );
        if (existing) {
          throw new Error('An account with this username/email already exists. Please sign in instead.');
        }

        const userId = 'usr_' + identifier.replace(/[^a-z0-9]/g, '_');
        const newUser = {
          id: userId,
          email: identifier.includes('@') ? identifier : `${identifier}@app.local`,
          username: identifier,
          name: name || rawInput,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('registered_users', JSON.stringify(users));
        state.user = { id: newUser.id, email: newUser.email, name: newUser.name };
      }

      localStorage.setItem('current_user_session', JSON.stringify(state.user));
      showToast('Account created successfully! Welcome!', 'success');
      await initApp();

    } else {
      // SIGN IN MODE
      if (supabaseClient) {
        const email = identifier.includes('@') ? identifier : `${identifier}@app.local`;
        const result = await supabaseClient.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        state.user = {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.user_metadata?.full_name || rawInput
        };
      } else {
        const usersJSON = localStorage.getItem('registered_users');
        const users = usersJSON ? JSON.parse(usersJSON) : [];

        let user = users.find(u =>
          (u.email && u.email.toLowerCase() === identifier) ||
          (u.username && u.username.toLowerCase() === identifier) ||
          (u.name && u.name.toLowerCase() === identifier)
        );

        if (!user) {
          // Auto-create local user account if password rules pass
          if (isPasswordValid(password)) {
            const userId = 'usr_' + identifier.replace(/[^a-z0-9]/g, '_');
            user = {
              id: userId,
              email: identifier.includes('@') ? identifier : `${identifier}@app.local`,
              username: identifier,
              name: rawInput,
              passwordHash: hashPassword(password),
              createdAt: new Date().toISOString()
            };
            users.push(user);
            localStorage.setItem('registered_users', JSON.stringify(users));
          } else {
            throw new Error('Account not found for this username/email. If you are new, click "Sign Up" below to create an account.');
          }
        } else if (user.passwordHash !== hashPassword(password)) {
          throw new Error('Incorrect password. Please check your credentials.');
        }

        state.user = { id: user.id, email: user.email || identifier, name: user.name || rawInput };
      }

      localStorage.setItem('current_user_session', JSON.stringify(state.user));
      showToast('Signed in successfully!', 'success');
      await initApp();
    }
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
