// ============================================
// COMPANY SETTINGS - Isolated Per User
// Logo, address, etc. saved per client ID
// ============================================

function getSettingsKey() {
  const userId = state.user?.id || 'guest';
  return `invoice_settings_${userId}`;
}

async function loadSettings() {
  if (!state.user) return;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('company_settings')
        .select('*')
        .eq('user_id', state.user.id)
        .maybeSingle();

      if (!error && data && Object.keys(data).length > 0) {
        state.settings = data;
        return;
      }
    } catch (err) {
      console.warn('Failed to load settings from Supabase:', err);
    }
  }

  const saved = localStorage.getItem(getSettingsKey()) || localStorage.getItem('invoice_settings_guest') || localStorage.getItem('invoice_settings');
  if (saved) {
    state.settings = JSON.parse(saved);
    if (!localStorage.getItem(getSettingsKey())) {
      localStorage.setItem(getSettingsKey(), JSON.stringify(state.settings));
    }
  } else {
    state.settings = null;
  }
}

function populateSettingsForm() {
  const s = state.settings || {};
  document.getElementById('s-company-name').value = s.company_name || '';
  document.getElementById('s-gstin').value = s.gstin || '';
  document.getElementById('s-address').value = s.company_address || '';
  document.getElementById('s-tagline').value = s.tagline || '';
  document.getElementById('s-phone').value = s.phone || '';
  document.getElementById('s-email').value = s.email || '';
  document.getElementById('s-bank-name').value = s.bank_name || '';
  document.getElementById('s-account-no').value = s.account_no || '';
  document.getElementById('s-ifsc').value = s.ifsc_code || '';
  document.getElementById('s-upi').value = s.upi_id || '';
  document.getElementById('s-prefix').value = s.invoice_prefix || 'INV';
  document.getElementById('s-gst-rate').value = s.default_gst_rate || 18;
  document.getElementById('s-currency').value = s.currency_symbol || '₹';
  document.getElementById('s-terms').value = s.default_terms || '';

  const preview = document.getElementById('logo-preview');
  if (s.logo_base64) {
    preview.innerHTML = `<img src="${s.logo_base64}" alt="Logo">`;
  } else {
    preview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  }
  updateSupabaseStatusUI();
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2097152) {
    showToast('Logo must be under 2MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const originalBase64 = ev.target.result;
    const croppedBase64 = await cropWhitespaceFromImage(originalBase64);
    if (!state.settings) state.settings = {};
    state.settings.logo_base64 = croppedBase64;
    document.getElementById('logo-preview').innerHTML = `<img src="${croppedBase64}" alt="Logo">`;
    localStorage.setItem(getSettingsKey(), JSON.stringify(state.settings));
    showToast('Logo uploaded & cropped cleanly!', 'success');
  };
  reader.readAsDataURL(file);
}

async function saveSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('save-settings-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const settingsData = {
    user_id: state.user?.id,
    company_name: document.getElementById('s-company-name').value,
    gstin: document.getElementById('s-gstin').value,
    company_address: document.getElementById('s-address').value,
    tagline: document.getElementById('s-tagline').value,
    phone: document.getElementById('s-phone').value,
    email: document.getElementById('s-email').value,
    bank_name: document.getElementById('s-bank-name').value,
    account_no: document.getElementById('s-account-no').value,
    ifsc_code: document.getElementById('s-ifsc').value,
    upi_id: document.getElementById('s-upi').value,
    invoice_prefix: document.getElementById('s-prefix').value || 'INV',
    default_gst_rate: parseFloat(document.getElementById('s-gst-rate').value) || 18,
    currency_symbol: document.getElementById('s-currency').value || '₹',
    default_terms: document.getElementById('s-terms').value,
    logo_base64: state.settings?.logo_base64 || '',
    updated_at: new Date().toISOString()
  };

  try {
    state.settings = settingsData;
    localStorage.setItem(getSettingsKey(), JSON.stringify(state.settings));

    if (supabaseClient && state.user?.id) {
      await supabaseClient
        .from('company_settings')
        .upsert(settingsData, { onConflict: 'user_id' });
    }

    if (typeof pushCloudUserData === 'function') pushCloudUserData();

    showToast('Settings saved & synced to cloud!', 'success');
  } catch (err) {
    showToast('Failed to save settings: ' + (err.message || 'Storage error'), 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Settings';
}

// ============================================
// ONBOARDING FLOW
// ============================================

function isCompanyProfileComplete() {
  return state.settings && state.settings.company_name && state.settings.company_name.trim() !== '';
}

function showOnboardingModal() {
  document.getElementById('ob-company-name').value = state.settings?.company_name || '';
  document.getElementById('ob-address').value = state.settings?.company_address || '';

  if (state.settings?.logo_base64) {
    document.getElementById('ob-logo-preview').innerHTML = `<img src="${state.settings.logo_base64}" alt="Logo">`;
  }

  document.getElementById('onboarding-modal').classList.add('active');
}

function closeOnboardingModal() {
  document.getElementById('onboarding-modal').classList.remove('active');
}

function handleOnboardingLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2097152) {
    showToast('Logo must be under 2MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const originalBase64 = ev.target.result;
    const croppedBase64 = await cropWhitespaceFromImage(originalBase64);
    if (!state.settings) state.settings = {};
    state.settings.logo_base64 = croppedBase64;
    document.getElementById('ob-logo-preview').innerHTML = `<img src="${croppedBase64}" alt="Logo">`;
  };
  reader.readAsDataURL(file);
}

async function saveOnboardingSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('ob-save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const settingsData = {
    user_id: state.user?.id,
    company_name: document.getElementById('ob-company-name').value,
    company_address: document.getElementById('ob-address').value,
    logo_base64: state.settings?.logo_base64 || '',
    updated_at: new Date().toISOString()
  };

  try {
    state.settings = { ...state.settings, ...settingsData };
    localStorage.setItem(getSettingsKey(), JSON.stringify(state.settings));

    if (supabaseClient && state.user?.id) {
      await supabaseClient
        .from('company_settings')
        .upsert(state.settings, { onConflict: 'user_id' });
    }

    showToast("Company profile saved! Let's create your invoice.", 'success');
    closeOnboardingModal();
    startNewInvoice();
  } catch (err) {
    showToast('Failed to save profile.', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Save & Continue';
}

// ============================================
// DATA BACKUP & SYNC FUNCTIONS
// ============================================
function exportDataBackup() {
  if (!state.user) {
    showToast('Please sign in first to export backup data', 'error');
    return;
  }
  const backupObj = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    user: state.user,
    settings: state.settings || {},
    invoices: state.invoices || []
  };
  const jsonStr = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const username = (state.user.name || state.user.email || 'user').split('@')[0].replace(/[^a-z0-9]/gi, '_');
  a.download = `invoice_maker_backup_${username}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported successfully!', 'success');
}

function importDataBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data || typeof data !== 'object') throw new Error('Invalid backup file format');

      if (data.settings) {
        state.settings = data.settings;
        localStorage.setItem(getSettingsKey(), JSON.stringify(state.settings));
      }
      if (Array.isArray(data.invoices)) {
        state.invoices = data.invoices;
        localStorage.setItem(getInvoicesKey(), JSON.stringify(state.invoices));
      }
      showToast('Backup imported successfully! Account updated.', 'success');
      populateSettingsForm();
      renderDashboard();
    } catch (err) {
      showToast('Failed to import backup: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// ============================================
// SUPABASE CLOUD MANAGEMENT FUNCTIONS
// ============================================
function updateSupabaseStatusUI() {
  const badge = document.getElementById('supabase-status-badge');
  const disconnectBtn = document.getElementById('btn-disconnect-supabase');
  const urlInput = document.getElementById('s-supabase-url');
  const keyInput = document.getElementById('s-supabase-key');

  if (urlInput && SUPABASE_URL) urlInput.value = SUPABASE_URL;
  if (keyInput && SUPABASE_ANON_KEY) keyInput.value = SUPABASE_ANON_KEY;

  if (badge) {
    if (supabaseClient && SUPABASE_URL) {
      const projName = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
      badge.innerHTML = '<span style="width:8px; height:8px; border-radius:50%; background:#10b981;"></span> Connected: ' + projName;
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = '#10b981';
      if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
    } else {
      badge.innerHTML = '<span style="width:8px; height:8px; border-radius:50%; background:#94a3b8;"></span> Not Connected (Local Mode)';
      badge.style.background = 'rgba(100, 116, 139, 0.2)';
      badge.style.color = '#94a3b8';
      if (disconnectBtn) disconnectBtn.style.display = 'none';
    }
  }
}

async function saveAndConnectSupabase() {
  const urlInput = document.getElementById('s-supabase-url');
  const keyInput = document.getElementById('s-supabase-key');
  const url = (urlInput?.value || '').trim();
  const key = (keyInput?.value || '').trim();

  if (!url || !key) {
    showToast('Please enter both Supabase Project URL and Anon Key', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-supabase');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Connecting & Syncing...';
  }

  try {
    const success = initSupabase(url, key);
    if (!success) {
      throw new Error('Could not initialize Supabase client with given URL & Key');
    }

    const { error } = await supabaseClient.from('company_settings').select('count', { count: 'exact', head: true });
    if (error && !error.message.includes('permission denied') && !error.message.includes('relation "company_settings" does not exist')) {
      throw new Error(error.message);
    }

    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);

    updateSupabaseStatusUI();
    showToast('Connected to Supabase! Syncing invoices & settings...', 'success');

    if (state.user) {
      await loadSettings();
      await loadInvoices();
      renderDashboard();
    }
  } catch (err) {
    showToast('Supabase connection error: ' + (err.message || 'Check URL & Key'), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg> Connect & Sync Database';
    }
  }
}

async function testSupabaseConnection() {
  const urlInput = document.getElementById('s-supabase-url');
  const keyInput = document.getElementById('s-supabase-key');
  const url = (urlInput?.value || SUPABASE_URL || '').trim();
  const key = (keyInput?.value || SUPABASE_ANON_KEY || '').trim();

  if (!url || !key) {
    showToast('Please enter Supabase URL and Key first', 'error');
    return;
  }

  showToast('Testing connection to Supabase...', 'info');
  try {
    const testClient = window.supabase.createClient(url, key);
    const { error } = await testClient.from('company_settings').select('count', { count: 'exact', head: true });
    if (error && !error.message.includes('permission denied') && !error.message.includes('relation "company_settings" does not exist')) {
      throw error;
    }
    showToast('Connection successful! Supabase is reachable on this network.', 'success');
  } catch (err) {
    showToast('Connection failed: ' + (err.message || 'Check URL & Key'), 'error');
  }
}

function disconnectSupabase() {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  SUPABASE_URL = '';
  SUPABASE_ANON_KEY = '';
  supabaseClient = null;
  const urlInput = document.getElementById('s-supabase-url');
  const keyInput = document.getElementById('s-supabase-key');
  if (urlInput) urlInput.value = '';
  if (keyInput) keyInput.value = '';
  updateSupabaseStatusUI();
  showToast('Disconnected from Supabase. App switched to local mode.', 'info');
}

function copySupabaseSetupSQL() {
  const sql = `-- ============================================================
-- Invoice Maker — Supabase Database Setup
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  company_address TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  logo_base64 TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  account_no TEXT DEFAULT '',
  ifsc_code TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  default_gst_rate NUMERIC DEFAULT 18,
  invoice_prefix TEXT DEFAULT 'INV',
  currency_symbol TEXT DEFAULT '₹',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS invoice_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER DEFAULT 0,
  UNIQUE(user_id, year)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_name TEXT DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  client_address TEXT DEFAULT '',
  client_gstin TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  gst_type TEXT NOT NULL DEFAULT 'cgst_sgst' CHECK (gst_type IN ('cgst_sgst', 'igst')),
  gst_rate NUMERIC NOT NULL DEFAULT 18,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  gst_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  item_order INTEGER DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  hsn_code TEXT DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON company_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON company_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON company_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own counter" ON invoice_counter FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own counter" ON invoice_counter FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own counter" ON invoice_counter FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoice items" ON invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can insert own invoice items" ON invoice_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can update own invoice items" ON invoice_items FOR UPDATE USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can delete own invoice items" ON invoice_items FOR DELETE USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(sql).then(() => {
      showToast('SQL setup script copied! Paste it in Supabase SQL Editor.', 'success');
    }).catch(() => {
      showToast('Could not copy automatically. Check supabase-setup.sql file.', 'info');
    });
  } else {
    showToast('Clipboard not supported in this browser. Open supabase-setup.sql.', 'info');
  }
}

