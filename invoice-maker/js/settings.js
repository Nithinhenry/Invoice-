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

    showToast('Settings saved! Your logo & details are remembered for your account.', 'success');
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

